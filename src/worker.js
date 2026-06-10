function j(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}
async function body(r){try{return await r.json()}catch{return {}}}
function txt(v,f,n){v=String(v??'').trim();return v?v.slice(0,n):f}
function code(v){return String(v??'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,18)}
function rid(){return crypto.randomUUID()}
function makeCode(){return Math.random().toString(36).slice(2,8).toUpperCase()}

export default{async fetch(r,e){let u=new URL(r.url);if(u.pathname.startsWith('/api/')){let id=e.LOBBY_DIRECTORY.idFromName('main');return e.LOBBY_DIRECTORY.get(id).fetch(r)}if(u.pathname.startsWith('/ws/room/')){let room=u.pathname.split('/').pop();let id=e.GAME_ROOM.idFromName(room);return e.GAME_ROOM.get(id).fetch(r)}return e.A