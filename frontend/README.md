# Frontend

## Table of Contents
- [Code Structure](#code-structure)
- [Connection with Backend](#connection-with-backend)

---

## Code Structure
The key part is src/.
```
src/
├─ components/             ← different components 
│   ├─ account/            ← Prompting graph logics implemented using Langgraph
│   └─ auth/               ← LLM calls using OpenAI API
|   └─ chat/               ← Parser for enforcing structured output
|   └─ feedback/           ← user feedbacks: conversation level 
|   └─ tutorial/           ← 
│
├─ context/                ← Prompts
│   ├─ few_shot_examples/       ← few shot examples of certain nodes
│   └─ agent.py            ← prompts that requires LLMs to analyze then generate
│   └─ module.py           ← other prompts
│
├─ hooks/                  ← hooks that could be shared by multiple scripts
│   └─ useAutoLogout.js    ← prompts that requires LLMs to analyze then generate
│   └─ useChat.js          ← other prompts
│   └─ useModal.js         ← other prompts
```


