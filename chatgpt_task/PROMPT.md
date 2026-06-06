# ChatGPT Task Scheduler Prototype

## System Requirements

Build a job scheduler with an MCP (Model Context Protocol) interface:
- Users schedule tasks for future execution via MCP tool calls
- A background watcher scans for due jobs and pushes them to a queue
- Workers pull jobs from the queue and execute them
- Support task creation, listing, status checking, and cancellation
- Tool naming follows namespace + action verb pattern (e.g., `task.create`)

### Architecture

```
User → MCP Tool Call → Job Scheduler API → DB
                                            ↓
                              Watcher (scans DB) → Queue → Worker (executes)
```

## Design Questions

Answer these before you start coding:

1. **Watcher vs Cron:** Why separate the watcher from the worker? What problems does a single cron job that both scans and executes have?
因為 scan 跟 execute 的時間數量級不同， scan 通常較快 execute 通常較慢，如果 watcher 跟 cron 沒有分開，cron 在執行 job 時會無法 scan，這會是瓶頸來源，也可能當 worker 死掉後，整個排程 failed 或是 worker 任務時間太久造成 scheduling drift。再加上這樣的設計才有機會水平擴展 worker，對於未來比較容易去 scale up

2. **Queue Layer:** Why put a queue between the watcher and worker instead of having the watcher call the worker directly? What are the benefits?
可以用 queue 來排程，讓 worker 去執行，甚至可以多個 worker （類似 python 中的 PoolExecuter)。同時，也可以設置 concurrency 上限我們最多的 jobs 數量來防止 server 超負荷，是一種 buffer

3. **Time Bucket Partitioning:** Instead of `SELECT * WHERE scheduled_at <= now()`, why partition jobs by time bucket (e.g., hour)? What happens to query performance at 1M+ jobs without partitioning?
因為當需求快速上升後`SELECT * WHERE scheduled_at <= now()` 仍然會把大量已經處理過的歷史 jobs 重新撈上來，完全是重複多餘的 I/O，所以如果 watcher 只要去查當前一個小時的區塊切割就可以降低索引需求量。 沒 partition、1M+ rows 情況下 scheduled_at 的索引橫跨整個歷史,range scan 的越來越大。Cache 命中率下降延遲大致隨表大小成長。


4. **Tool Naming:** Why `task.create` instead of `createTask`? How does naming convention affect LLM tool selection accuracy?
因為LLM 這樣比較不容易出錯。因為名詞統一放在前面當作 prefix，算是提前先做一個分類了，可以有效地提升 accuracy。


5. **Registry vs If-Else:** Why use a dictionary registry to route tool calls instead of if-else chains? What happens when you need to add the 20th tool?
if-else 結構是屬於 O(n) 需要 go through 整個方法，但是用 dictionary 是 O(1) dispatch，除了效能差距更重要的是 tool 之間互不影響。

## Verification

Your prototype is a real MCP server. Test it with the MCP inspector — no Claude needed.

### 1. Start the server (sanity check)

```bash
python -m app.mcp_server
```

The process should hang waiting on stdin (it's a stdio MCP server — that's correct). Ctrl+C to stop. If you see an `ImportError` or other crash, fix that first.

### 2. Run the MCP inspector

Requires Node.js (uses `npx`).

```bash
npx @modelcontextprotocol/inspector python -m app.mcp_server
```

This opens a browser GUI (usually `http://localhost:5173`).

Steps in the GUI:

1. Click **Connect** -> should show 4 tools: `task.create`, `task.list`, `task.status`, `task.cancel`
2. **task.create** -> fill `description="Summarize tech news"`, `scheduled_at="2025-01-01T00:00:00"` (past time so watcher picks it up immediately) -> **Run Tool** -> response should include `{"job_id": 1, "status": "pending", ...}`
3. Wait ~10 seconds, then **task.status** -> `job_id: 1` -> status should now be `"completed"`
4. **task.create** with future time `"2099-12-31T00:00:00"` -> get `job_id: 2`
5. **task.cancel** -> `job_id: 2` -> status `"cancelled"`
6. **task.list** -> see all your jobs

### 3. (Optional) Connect to Claude Desktop / Claude Code

Once the inspector tests pass, the server is ready. To talk to it through Claude:

**Claude Desktop**: edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) and add (use absolute paths):

```json
{
  "mcpServers": {
    "task-scheduler": {
      "command": "/absolute/path/to/scaffold/.venv/bin/python",
      "args": ["-m", "app.mcp_server"],
      "cwd": "/absolute/path/to/scaffold"
    }
  }
}
```

Restart Claude Desktop fully. The 🔨 icon in the chat input should show 4 tools.

**Claude Code**: edit `~/.claude.json` (top-level `mcpServers` for user scope) with the same block, or run `claude mcp add` from inside `scaffold/`.

Then chat:
> "Schedule a task to review PR #123 tomorrow at 9am."
> -> Claude calls `task.create` -> returns job_id
> "What's the status of that task?"
> -> Claude calls `task.status`

## Suggested Tech Stack

Python + the official `mcp` SDK is recommended (already in `requirements.txt` for the Guided Track). Challenge Track may use any language with an MCP SDK.
