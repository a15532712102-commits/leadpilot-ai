import {mkdir,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {passwordHash} from '../backend/src/cloud.js';
const folder=resolve(process.argv[2]||'');
const project=resolve(fileURLToPath(new URL('../',import.meta.url)));
if(!process.argv[2]||folder===project||folder.startsWith(project+'/'))throw Error('请指定项目目录以外的私人凭据目录');
await mkdir(folder,{recursive:true,mode:0o700});
try{await access(folder+'/login-private.json');console.log('Private login already exists; not replaced');process.exit(0)}catch{}
const password=randomBytes(24).toString('base64url'),hash=await passwordHash(password);
const origin='https://leadpilot-search-private.a15532712102.workers.dev';
await writeFile(folder+'/login-private.json',JSON.stringify({username:'owner',password,origin}),{mode:0o600});
await writeFile(folder+'/login-password-hash.txt',hash,{mode:0o600});
await writeFile(folder+'/LeadPilot_云端登录凭据.txt',`LeadPilot 云端正式网址：${origin}\n账号：owner\n初始密码：${password}\n\n仅保存在这份本机私人文件中，未写入前端、GitHub或聊天。请保存到你自己的密码管理器，以便Mac关机后在iPhone登录。不要把此文件发到聊天或提交到仓库。\n`,{mode:0o600});
console.log('Initial login generated privately. Password was not printed.');
