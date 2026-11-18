// PROJECT SB Commerce — Cloudflare Pages Worker authentication API.
// Requires DATABASE_URL (Neon PostgreSQL) and AUTH_SECRET (random 32+ bytes).
// Run sql/001_auth.sql in Neon SQL Editor before enabling these endpoints.
// Passwords: PBKDF2-SHA256, 120000 iterations, 16-byte random salt.
// All protected endpoints verify the session and user role server-side.
const enc=new TextEncoder();
const headers={"content-type":"application/json;charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});
const b64=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const un64=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const hmacKey=secret=>crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
async function sign(value,secret){return b64(await crypto.subtle.sign("HMAC",await hmacKey(secret),enc.encode(value)))}
async function token(user,secret){const p=b64(enc.encode(JSON.stringify({sub:user.id,role:user.role,exp:Date.now()+7*86400000})));return p+"."+await sign(p,secret)}
async function session(req,secret){const m=(req.headers.get("cookie")||"").match(/(?:^|;\s*)sb_session=([^;]+)/);if(!m||!secret)return null;const [p,s]=m[1].split(".");if(!p||!s)return null;const key=await hmacKey(secret);if(!await crypto.subtle.verify("HMAC",key,un64(s),enc.encode(p)))return null;const data=JSON.parse(new TextDecoder().decode(un64(p)));return typeof data.exp==="number"&&data.exp>Date.now()?data:null}
async function hash(password,salt){const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);return b64(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:un64(salt),iterations:120000},key,256))}
async function passwordHash(password){const salt=b64(crypto.getRandomValues(new Uint8Array(16)));return "pbkdf2$120000$"+salt+"$"+await hash(password,salt)}
async function verifyPassword(password,stored){const p=stored?.split("$");if(p?.length!==4||p[0]!=="pbkdf2"||p[1]!=="120000")return false;const a=un64(p[3]),b=un64(await hash(password,p[2]));return a.length===b.length&&a.every((v,i)=>v===b[i])}
function neonEndpoint(connection){const u=new URL(connection);if(!u.hostname.endsWith(".neon.tech"))throw Error("Invalid Neon host");return "https://"+u.hostname+"/sql"}
async function sql(env,query,params=[]){if(!env.DATABASE_URL)throw Error("Database not configured");const r=await fetch(neonEndpoint(env.DATABASE_URL),{method:"POST",headers:{"content-type":"application/json","Neon-Connection-String":env.DATABASE_URL,"Neon-Raw-Text-Output":"true","Neon-Array-Mode":"false"},body:JSON.stringify({query,params})});if(!r.ok)throw Error("Database query failed ("+r.status+")");const out=await r.json();if(out.message||out.error)throw Error("Database query rejected");return out.rows||[]}
const cookie=(value,maxAge)=>"sb_session="+value+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+maxAge;
const validUser=s=>typeof s==="string"&&/^[a-zA-Z0-9_.]{3,32}$/.test(s);
const validEmail=s=>typeof s==="string"&&s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const validPhone=s=>typeof s==="string"&&/^\+?[0-9]{9,16}$/.test(s.replace(/[ -]/g,""));
async function parse(req){if(Number(req.headers.get("content-length")||0)>5000)throw Error("Too large");const text=await req.text();if(text.length>5000)throw Error("Too large");return JSON.parse(text)}
const sameOrigin=req=>{const origin=req.headers.get("origin");return !origin||origin===new URL(req.url).origin};
export default {async fetch(req,env){const url=new URL(req.url),path=url.pathname;
if(!path.startsWith("/api/"))return json({error:"API route only"},404);
if(req.method==="OPTIONS")return json({error:"Method not allowed"},405);
if(req.method!=="GET"&&!sameOrigin(req))return json({error:"Forbidden origin"},403);
try{
if(path==="/api/health"&&req.method==="GET"){await sql(env,"SELECT 1 AS ok");return json({ok:true,database:"connected"})}
if(!env.AUTH_SECRET||env.AUTH_SECRET.length<32)return json({error:"Authentication service not configured"},503);
if(path==="/api/catalog"&&req.method==="GET"){const rows=await sql(env,"SELECT p.id,p.name,p.description,p.category,p.price,p.stock,p.images,p.discount_type,p.discount_value,p.discount_ends_at,s.slug AS store_slug,s.name AS store_name FROM sb_products p JOIN sb_stores s ON s.id=p.store_id JOIN sb_users u ON u.id=s.owner_id WHERE p.status='ACTIVE' AND u.status='ACTIVE' ORDER BY p.created_at DESC LIMIT 200");return json({products:rows})}
if(path==="/api/register"&&req.method==="POST"){const d=await parse(req);if(!validUser(d.username)||!validEmail(d.email)||!validPhone(d.phone)||typeof d.name!=="string"||d.name.trim().length<2||d.name.length>100||typeof d.password!=="string"||d.password.length<12||d.password.length>128)return json({error:"Periksa nama, username, email, HP, dan password minimal 12 karakter"},400);const role=d.owner===true?"OWNER":"CUSTOMER";if(role==="OWNER"&&(!d.storeName||d.storeName.length>120))return json({error:"Nama toko wajib diisi"},400);const pw=await passwordHash(d.password);const rows=await sql(env,"INSERT INTO sb_users (name,username,email,phone,password_hash,role,status,store_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id",[d.name.trim(),d.username.toLowerCase(),d.email.toLowerCase(),d.phone,pw,role,role==="OWNER"?"PENDING":"ACTIVE",role==="OWNER"?d.storeName:null]);if(!rows.length)return json({error:"Username, email, atau nomor HP sudah digunakan"},409);return json({ok:true,message:role==="OWNER"?"Pendaftaran menunggu persetujuan":"Akun berhasil dibuat"},201)}
if(path==="/api/login"&&req.method==="POST"){const d=await parse(req);if(!validUser(d.username)||typeof d.password!=="string")return json({error:"Username atau password salah"},401);const rows=await sql(env,"SELECT id,username,password_hash,role,status FROM sb_users WHERE username=$1 LIMIT 1",[d.username.toLowerCase()]);const u=rows[0];if(!u||!await verifyPassword(d.password,u.password_hash)||u.status!=="ACTIVE")return json({error:"Username/password salah atau akun belum aktif"},401);const t=await token(u,env.AUTH_SECRET);return json({ok:true,role:u.role,username:u.username},200,{"set-cookie":cookie(t,604800)})}
if(path==="/api/me"&&req.method==="GET"){const s=await session(req,env.AUTH_SECRET);if(!s)return json({authenticated:false},401);const rows=await sql(env,"SELECT id,username,name,email,role,status FROM sb_users WHERE id=$1 LIMIT 1",[s.sub]);const u=rows[0];if(!u||u.status!=="ACTIVE")return json({authenticated:false},401);return json({authenticated:true,user:u})}
if(path==="/api/logout"&&req.method==="POST")return json({ok:true},200,{"set-cookie":cookie("",0)});
if(path==="/api/checkout"&&req.method==="POST"){const s=await session(req,env.AUTH_SECRET);if(!s)return json({error:"Login diperlukan",login:"/login?next=%2Fcheckout"},401);const rows=await sql(env,"SELECT id,role,status FROM sb_users WHERE id=$1",[s.sub]);if(!rows.length||rows[0].status!=="ACTIVE"||rows[0].role!=="CUSTOMER")return json({error:"Akses pelanggan diperlukan"},403);return json({error:"Pembayaran belum diaktifkan; pesanan tidak dibuat"},503)}
if(path==="/api/admin/owners"&&req.method==="GET"){const s=await session(req,env.AUTH_SECRET);if(!s||s.role!=="SUPER_ADMIN")return json({error:"Forbidden"},403);const rows=await sql(env,"SELECT id,name,username,email,phone,store_name,created_at FROM sb_users WHERE role='OWNER' AND status='PENDING' ORDER BY created_at DESC LIMIT 100");return json({owners:rows})}
if(path==="/api/admin/owners/decision"&&req.method==="POST"){const s=await session(req,env.AUTH_SECRET);if(!s||s.role!=="SUPER_ADMIN")return json({error:"Forbidden"},403);const d=await parse(req);if(!/^[0-9a-f-]{36}$/i.test(d.id||"")||!["APPROVE","REJECT"].includes(d.action))return json({error:"Invalid request"},400);const rows=await sql(env,"UPDATE sb_users SET status=$1 WHERE id=$2 AND role='OWNER' AND status='PENDING' RETURNING id",[d.action==="APPROVE"?"ACTIVE":"REJECTED",d.id]);if(rows.length&&d.action==="APPROVE")await sql(env,"INSERT INTO sb_stores(owner_id,slug,name) SELECT id,'store-' || replace(id::text,'-',''),COALESCE(NULLIF(store_name,''),username) FROM sb_users WHERE id=$1 AND role='OWNER' AND status='ACTIVE' ON CONFLICT(owner_id) DO NOTHING",[d.id]);return json({ok:rows.length===1})}

// Multi-tenant catalog endpoints. Store identity comes from authenticated session only.
if(path==="/api/owner/store"&&["GET","PUT"].includes(req.method)){
 const sess=await session(req,env.AUTH_SECRET);
 if(!sess)return json({error:"Login diperlukan"},401);
 const users=await sql(env,"SELECT id,role,status,store_name FROM sb_users WHERE id=$1 LIMIT 1",[sess.sub]);
 const user=users[0];if(!user||user.role!=="OWNER"||user.status!=="ACTIVE")return json({error:"Akses Owner diperlukan"},403);
 if(req.method==="GET"){await sql(env,"INSERT INTO sb_stores(owner_id,slug,name) SELECT id,'store-' || replace(id::text,'-',''),COALESCE(NULLIF(store_name,''),username) FROM sb_users WHERE id=$1 AND role='OWNER' AND status='ACTIVE' ON CONFLICT(owner_id) DO NOTHING",[user.id]);const rows=await sql(env,"SELECT id,slug,name,logo_url,theme,navigation,content,chat_settings FROM sb_stores WHERE owner_id=$1 LIMIT 1",[user.id]);return json({store:rows[0]||null})}
 const d=await parse(req);if(!d||typeof d.name!=="string"||!d.name.trim()||d.name.length>120)return json({error:"Nama toko tidak valid"},400);
 const logo=typeof d.logoUrl==="string"&&d.logoUrl.length<2048&&/^https:\/\//.test(d.logoUrl)?d.logoUrl:null;
 const obj=x=>x&&typeof x==="object"&&!Array.isArray(x)?x:{};
 const rows=await sql(env,"UPDATE sb_stores SET name=$1,logo_url=$2,theme=$3::jsonb,navigation=$4::jsonb,content=$5::jsonb,chat_settings=$6::jsonb,updated_at=now() WHERE owner_id=$7 RETURNING id,name,slug",[d.name.trim(),logo,JSON.stringify(obj(d.theme)),JSON.stringify(obj(d.navigation)),JSON.stringify(obj(d.content)),JSON.stringify(obj(d.chatSettings)),user.id]);
 if(!rows.length)return json({error:"Toko belum dibuat. Hubungi administrator."},409);
 return json({ok:true,store:rows[0]});
}
if(path==="/api/owner/products"&&["GET","POST"].includes(req.method)||/^\/api\/owner\/products\/[0-9a-f-]{36}$/i.test(path)&&["PUT","DELETE"].includes(req.method)){
 const sess=await session(req,env.AUTH_SECRET);if(!sess)return json({error:"Login diperlukan"},401);
 const users=await sql(env,"SELECT id,role,status FROM sb_users WHERE id=$1 LIMIT 1",[sess.sub]);
 if(!users[0]||users[0].role!=="OWNER"||users[0].status!=="ACTIVE")return json({error:"Akses Owner diperlukan"},403);
 await sql(env,"INSERT INTO sb_stores(owner_id,slug,name) SELECT id,'store-' || replace(id::text,'-',''),COALESCE(NULLIF(store_name,''),username) FROM sb_users WHERE id=$1 AND role='OWNER' AND status='ACTIVE' ON CONFLICT(owner_id) DO NOTHING",[sess.sub]);
 const stores=await sql(env,"SELECT id FROM sb_stores WHERE owner_id=$1 LIMIT 1",[sess.sub]);
 if(!stores.length)return json({error:"Toko belum dibuat"},409);
 const storeId=stores[0].id;
 if(req.method==="GET"){const rows=await sql(env,"SELECT id,name,description,category,price,stock,images,discount_type,discount_value,discount_ends_at,status,created_at FROM sb_products WHERE store_id=$1 ORDER BY created_at DESC LIMIT 500",[storeId]);return json({products:rows})}
 if(req.method==="DELETE"){const id=path.split("/").pop();const rows=await sql(env,"DELETE FROM sb_products WHERE id=$1 AND store_id=$2 RETURNING id",[id,storeId]);return json({ok:rows.length===1})}
 const d=await parse(req);
 if(!d||typeof d.name!=="string"||!d.name.trim()||d.name.length>180||!Number.isFinite(Number(d.price))||Number(d.price)<0||!Number.isInteger(Number(d.stock))||Number(d.stock)<0)return json({error:"Data produk tidak valid"},400);
 const images=Array.isArray(d.images)?d.images.filter(x=>typeof x==="string"&&x.length<2048&&/^https:\/\//.test(x)).slice(0,20):[];
 const kind=["NONE","PERCENT","AMOUNT"].includes(d.discountType)?d.discountType:"NONE";
 const discount=Number(d.discountValue||0);if(!Number.isFinite(discount)||discount<0||(kind==="PERCENT"&&discount>100))return json({error:"Diskon tidak valid"},400);
 const status=["DRAFT","ACTIVE","ARCHIVED"].includes(d.status)?d.status:"DRAFT";
 const values=[d.name.trim(),String(d.description||"").slice(0,5000),String(d.category||"").slice(0,120),Number(d.price),Number(d.stock),JSON.stringify(images),kind,discount,d.discountEndsAt||null,status];
 let rows;
 if(req.method==="POST")rows=await sql(env,"INSERT INTO sb_products(store_id,name,description,category,price,stock,images,discount_type,discount_value,discount_ends_at,status) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11) RETURNING id",[storeId,...values]);
 else rows=await sql(env,"UPDATE sb_products SET name=$1,description=$2,category=$3,price=$4,stock=$5,images=$6::jsonb,discount_type=$7,discount_value=$8,discount_ends_at=$9,status=$10,updated_at=now() WHERE id=$11 AND store_id=$12 RETURNING id",[...values,path.split("/").pop(),storeId]);
 return json({ok:rows.length===1,id:rows[0]?.id},rows.length?200:404);
}

return json({error:"Not found"},404)
}catch(e){return json({error:"Permintaan tidak dapat diproses"},500)}
}};
