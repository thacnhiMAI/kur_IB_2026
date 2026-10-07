const {stripTypeScriptTypes} = require('node:module');
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let config, existing=null, linked=null, active=null, intent='signin', current=null;
const ctx={process:{env:{}}, console, Date, Map,
 PrismaAdapter:()=>({}), bcrypt:{compare:async()=>true}, Credentials:x=>x, GitHub:x=>x, Google:x=>x,
 NextAuth:x=>{config=x;return {handlers:{},auth:async()=>active,signIn(){},signOut(){}}},
 cookies:async()=>({get:()=>({value:intent}),set(){}}),
 getUserAccessState:u=>({blocked:!!u.bannedPermanently}),
 assertAuthRateLimit:async()=>{},clearAuthRateLimit:async()=>{},signInSchema:{safeParse:()=>({success:false})},
 db:{user:{findUnique:async args=>args.where.email?existing:current,update:async()=>{}},account:{findUnique:async()=>linked}}
};
let src=fs.readFileSync(require('node:path').join(__dirname, '../src/auth.ts'),'utf8').replace(/^import[^;]+;\n/gm,'');
src=stripTypeScriptTypes(src).replace('export const','const');
vm.createContext(ctx);vm.runInContext(src,ctx);
const params=()=>({user:{email:'someone@gmail.com'},account:{provider:'google',providerAccountId:'google-sub'},profile:{email:'Someone@Gmail.com',email_verified:true,sub:'google-sub'}});
(async()=>{
 assert.equal(await config.callbacks.signIn(params()),'/auth/sign-in?error=AccountNotRegistered');
 intent='signup';assert.equal(await config.callbacks.signIn(params()),true);
 intent='signin';existing={id:'real',email:'someone@gmail.com',emailVerified:new Date(),authVersion:0};
 assert.equal(await config.callbacks.signIn(params()),true);
 linked={user:{id:'demo',email:'reader@example.com'}};
 assert.equal(await config.callbacks.signIn(params()),'/auth/sign-in?error=GoogleIdentityMismatch');
 linked=null;active={user:{id:'demo'}};
 assert.equal(await config.callbacks.signIn(params()),'/auth/sign-in?error=GoogleIdentityMismatch');
 active=null;existing.bannedPermanently=true;
 assert.equal(await config.callbacks.signIn(params()),false);
 existing.bannedPermanently=false;existing.emailVerified=null;
 assert.equal(await config.callbacks.signIn(params()),'/auth/sign-in?error=EmailNotVerified');
 const p=params();p.profile.email_verified=false;
 assert.equal(await config.callbacks.signIn(p),'/auth/sign-in?error=GoogleEmailUnverified');
 p.profile.email_verified=true;p.profile.sub='wrong';
 assert.equal(await config.callbacks.signIn(p),'/auth/sign-in?error=GoogleEmailUnverified');
 current={role:'USER',email:'someone@gmail.com',name:'Reader',image:null,authVersion:1};
 assert.equal(await config.callbacks.jwt({token:{id:'real',email:current.email,authVersion:0}}),null);
 assert.equal(await config.callbacks.jwt({token:{id:'real',email:'reader@example.com',authVersion:1}}),null);
 const token=await config.callbacks.jwt({token:{id:'real',email:current.email,authVersion:1}});
 assert.equal(token.email,current.email);
 const session=await config.callbacks.session({session:{user:{}},token});
 assert.equal(session.user.email,current.email);
 console.log('12 auth regression checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
