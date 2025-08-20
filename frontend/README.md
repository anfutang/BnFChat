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
│   ├─ account/            ← user account page
│   └─ auth/               ← authentification related
|   └─ chat/               ← avatar dropdown menu; chat interface; chat area
|   └─ feedback/           ← user feedback: conversation level or app level feedback
|   └─ tutorial/           ← text & animation (implemented using ```react-joyride```) tutorials
│
├─ context/                ← 
│   └─ AutoContext.js      ← authentification information
│
├─ hooks/                  ← hooks that could be shared by multiple scripts
│   └─ useAutoLogout.js    ← autologout: (1) user inactive during 10 minutes; (2) page closed
│   └─ useChat.js          ← ❕important: most socket actions, communication with backend 
```

## Connection with Backend
The most important file is ```src/chat/ChatInterface.js``` and ```src/hooks/useChat.js```.

Several types of events are defined in ```src/hooks/useChat.js```:
- **user information related**: fetch user data from the backend.
- **chat related**: display chat related messages to users such as system response, detected user intent, generated SRU...
- **result related**: display facet recommendation or generated SRU to users.
- **feedback related**: allow users to give feedback, either in the form of popped up modal or clickable buttons.
- **action related**: buttons such as erasing the current conversation, starting a new chat, changing the conversation mode.

```ChatInterface``` uses destructuring assignment in React to import state values, status indicators, and action functions from ```useChat```, which are then passed to components such as:
- ```AvatarDropdown```: clickable user avatar at the top right of the interface.
- ```ModeSelector```: mode selector at the top bar.
- ❕```ChatArea```: main chat area.

