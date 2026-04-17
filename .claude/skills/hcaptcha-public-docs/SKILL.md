---
name: hcaptcha-public-docs
description: Reads and cites public hCaptcha docs from docs.hcaptcha.com LLM markdown endpoints with local search-index discovery. Use for non-Enterprise integration, configuration, API, SDK, migration, and troubleshooting requests. If a request is Enterprise-only, hand off to hcaptcha-enterprise-docs.
---

# hCaptcha Public Docs Skill

Use this workflow for any task that needs authoritative hCaptcha public docs context.

## Invocation

- Codex explicit: `/skills` then select `$hcaptcha-public-docs`
- Codex implicit: allow description matching
- Claude Code install locations:
  - project: `.claude/skills/hcaptcha-public-docs/SKILL.md`
  - personal: `~/.claude/skills/hcaptcha-public-docs/SKILL.md`
- Claude Code explicit: `/hcaptcha-public-docs`

## URL mapping

- `https://docs.hcaptcha.com/` -> `https://docs.hcaptcha.com/llm/index.md`
- `https://docs.hcaptcha.com/<path>` -> `https://docs.hcaptcha.com/llm/<path>.md`

## Scope guardrails

- This skill is public-docs only.
- Do not answer Enterprise-only topics from this skill.
- Enterprise-only signals include: APT Mitigation, Reporting APIs, Private Learning, enterprise management APIs, or `/enterprise/...` docs.
- If Enterprise-only, reply with handoff:
  - `Use $hcaptcha-enterprise-docs (https://docs.hcaptcha.com/enterprise/agent_skills).`

## Retrieval workflow

Search cache ID endpoint:
- `https://docs.hcaptcha.com/llm/search-cache-id.txt`

1. Discover relevant doc paths from the search index first (fast path):

```bash
set -euo pipefail

CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/hcaptcha-docs/public-search-index.json"
INDEX="${HCAPTCHA_DOCS_SEARCH_INDEX:-}"
QUERY="${1:-${HCAPTCHA_DOCS_QUERY:-siteverify}}"
[ -s "${INDEX:-}" ] || INDEX="$(ls -1 ./search-index-*.json 2>/dev/null | head -n1 || true)"
[ -s "${INDEX:-}" ] || INDEX="$CACHE"

if [ ! -s "$INDEX" ]; then
  mkdir -p "$(dirname "$CACHE")"
  ID="$(curl -fsSL https://docs.hcaptcha.com/llm/search-cache-id.txt | tr -d '\r\n')"
  curl -fsSL "https://docs.hcaptcha.com/search-index-${ID}.json" > "$CACHE"
  INDEX="$CACHE"
fi

node - <<'NODE' "$INDEX" "$QUERY"
const fs=require("fs"),[p,q]=process.argv.slice(2),needle=q.toLowerCase();let n=0,seen=new Set();
for(const b of JSON.parse(fs.readFileSync(p,"utf8"))){
  for(const d of b.documents||[]){
    const h=[d.t,d.s,d.u,...(d.b||[])].filter(Boolean).join(" ").toLowerCase();
    if(h.includes(needle)&&!seen.has(d.u)){seen.add(d.u);console.log(`${d.t}\t${d.u}`);if(++n>=20)process.exit(0);}
  }
}
NODE
```

2. Fetch only the matching markdown pages under `https://docs.hcaptcha.com/llm/*.md`.
3. For broad requests, read `https://docs.hcaptcha.com/llm/index.md` first.
4. Cite source URLs used in the final answer.
5. Never cite local file paths as sources; cite only docs URLs.

## Enterprise handoff

If the request needs Enterprise-only docs or features, switch to:
`$hcaptcha-enterprise-docs` at `https://docs.hcaptcha.com/enterprise/agent_skills` (requires Enterprise API key setup)

## Fallback

If search index discovery is unavailable, fetch the most relevant `/llm/...` markdown pages directly, cache them locally, and search that local cache with `rg` (or your preferred grep-like tool).
