# Bwari Life

A 3D, multiplayer life simulation of one Bar Part II session at the Nigerian Law School, Bwari Campus.
Create your aspirant, walk the campus, attend 9am lectures, survive the three dinners, externship, portfolio, the moot,
Bar Finals and the Call to Bar. Real people share the same campus: you see them walk, you chat with speech bubbles,
and you can talk by voice when you stand near each other.

## Play

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

Controls: WASD or arrow keys to walk, tap or click the ground to walk there, drag to look around, scroll or pinch to zoom,
Shift to run, E or the Interact button at any door or next to a coursemate, Enter to chat, the emote buttons to dance or wave,
Voice to talk to people near you. On a phone there is a joystick and a run button.

## How it is built

- `src/avatar.js` assembles Ready Player Me style avatars from swappable parts (body, face, hair, top, bottom, shoes, beard, hat,
  glasses) bound to one skeleton, recolours skin, hair and outfits in a shader, adds procedural Nigerian hairstyles (low cut, fade,
  afro, braids, twists, bun, hijab, cap) and runs the animation state machine (idle, walk, run, dances, talking, emotes).
- `src/world.js` builds the campus: lecture hall, library, hostels, cafeteria, clinic, dining hall, chapel, mosque, court,
  Bwari Junction market, sports field, roads, trees, street lights and a day and night cycle.
- `src/controls.js` third person camera, keyboard, click to move, touch joystick and collisions.
- `src/game.js` the life sim rules: six needs, the 20 week calendar, money, actions at every place, random Bwari wahala,
  MCQ quizzes, portfolio, moot, dinners, externship, Bar Finals and the ending.
- `src/npc.js` five coursemates who wander the campus and can be talked to.
- `src/net.js` multiplayer over Supabase Realtime (presence and broadcast) plus WebRTC proximity voice.
- `tools/` the asset pipeline that splits source avatars into parts and prepares animations.

## Assets and credits

- Avatar models: Ready Player Me avatars taken from public open source example repositories (three.js examples and
  Wawa Sensei tutorials). Ready Player Me's hosted service shut down on 31 January 2026, so the models are bundled here.
- Animations: Ready Player Me animation library (github.com/readyplayerme/animation-library).
- City props: KayKit City Builder Bits by Kay Lousberg, CC0 (see `public/props/KAYKIT_LICENSE.txt`).

## Multiplayer backend

`src/config.js` points at a Supabase project. Only Realtime channels are used, nothing is written to the database.
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` to use a different project.
