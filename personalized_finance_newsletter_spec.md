# Personalized Daily Finance Newsletter — Spec

## 1) Goal
Build a daily newsletter system that:
- ingests the latest finance news and official events from selected sources  
- maps them to a user’s synthetic portfolio  
- filters and ranks only the items relevant to the user’s holdings  
- generates a useful daily newsletter  
- uses agentic skills to select rules, justify decisions, and produce outputs that can be evaluated by multiple agents  

## 2) Primary Use Case
For a given user and run date:

### Data ingestion
- Finnhub  
- Google News / RSS  
- Moneycontrol  
- SEBI  

### Processing
- normalize into a common event schema  
- map each item to:
  - stock  
  - AMC / fund house  
  - mutual fund  
  - sector / theme  
  - regulatory topic  

### Scoring
- relevance  
- importance  

### Output
Generate newsletter with:
- top items  
- why they matter  
- actionability / watchlist cues  
- source links  

### Evaluation
Run agents on:
- factual grounding  
- relevance  
- usefulness  
- style / verbosity  
- rule compliance  

## 3) Scope
### In scope
- Personalized daily digest  
- Stocks + mutual funds  
- Official events + news  
- Rule-based + LLM ranking  
- Multi-agent evaluation  
- OpenAI-based orchestration  

### Out of scope
- Trading execution  
- Intraday alerts  
- Price prediction  
- Personalized advice  
- Full article scraping  

## 4) Source Strategy
- Finnhub → structured stock news  
- Google News / RSS → broad coverage  
- Moneycontrol → India-specific (scrape cautiously)  
- SEBI → regulatory updates  

## 5) Legal / Data Usage
- Prefer APIs + RSS  
- Store headline, snippet, URL  
- Avoid full article storage  
- Respect robots.txt  

## 6) Product Requirements
- Portfolio-aware filtering  
- Daily newsletter (5–15 items)  
- Normalization  
- Explainability  
- Agentic rule selection  
- Multi-agent evaluation  

## 7) Non-functional Requirements
- < 3 min / 1k users  
- idempotent runs  
- caching + dedupe  
- JSON outputs  

## 8) Architecture
Source → Normalize → Entity → Relevance → Compose → Evaluate → Deliver

## 9) Data Models
Raw Item, Normalized Event, Portfolio, Ranked Match (JSON structured)

## 10) Relevance Rules
- Stock, MF, Regulatory rules  
- Weighted scoring  
- Hard filters (dedupe, stale, irrelevant)

## 11) Agentic Skills
- Source triage  
- Entity resolution  
- Rule selector  
- Scoring explainer  
- Composer  
- Evaluator  

## 12) Multi-agent Workflow
- ingestion → entity → rules → composer → evaluators  

## 13) Newsletter Output
Sections:
- portfolio updates  
- MF updates  
- regulatory watch  
- market context  
- watchlist  

## 14) Evaluation Framework
- grounding, relevance, coverage, utility, compliance  

## 15) Prompt Strategy
- deterministic + JSON-first  
- NL only at final stage  

## 16) OpenAI Stack
- openai SDK  
- openai-agents-python  

## 17) Tech Stack
- FastAPI, Postgres, Redis  
- httpx, feedparser  
- pandas, pydantic  

## 18) Internal APIs
- ingest/run  
- portfolio-news/match  
- newsletter/generate  
- newsletter/evaluate  
- newsletter/publish  

## 19) Storage
- raw items  
- normalized events  
- matches  
- newsletter runs  
- evaluations  

## 20) Failure Handling
- degrade gracefully  
- dedupe  
- fail closed on hallucination  

## 21) Rollout Plan
- Phase 1: Finnhub + Google News + SEBI  
- Phase 2: Moneycontrol + MF depth  
- Phase 3: NSE/BSE + personalization  

## 22) Final Recommendation
- deterministic engine first  
- LLM for reasoning  
- multi-agent evaluators  
- API-first approach  
