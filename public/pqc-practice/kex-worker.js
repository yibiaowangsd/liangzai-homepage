import { NGCC_KEX_WASM } from './ngcc-kex-runtime.js';
let mod=null, busy=false, nextPass=1, publicShared=false;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function material(slot,label){
  const bytes=mod._lab_session_bytes(slot),ptr=mod._lab_session_data(slot);
  if(bytes<0||bytes>16777216||!ptr)throw new Error('协议材料长度异常');
  const data=mod.HEAPU8.slice(ptr,ptr+bytes);
  const result={slot,label,bytes,preview:hex(data.subarray(0,128)),fingerprint:hex(new Uint8Array(await crypto.subtle.digest('SHA-256',data)))};
  data.fill(0);return result;
}
self.onmessage=async({data})=>{
  if(busy)return;
  busy=true;
  try{
    const start=performance.now();let result;
    if(data.action==='init'){
      const name=NGCC_KEX_WASM[data.id]?.[data.index];
      if(!name)throw new Error('当前参数尚无经过验证的浏览器实现');
      const {default:factory}=await import(`./wasm/${name}.mjs`);
      mod=await factory({locateFile:name=>new URL(`./wasm/${name}`,import.meta.url).href});
      if(!mod._lab_session_start)throw new Error('模块版本过旧，请刷新后重试');
      const seed=mod._malloc(48);if(!seed)throw new Error('内存不足');
      try{mod.HEAPU8.set(crypto.getRandomValues(new Uint8Array(48)),seed);if(mod._lab_seed(seed,48))throw new Error('随机数初始化失败');}
      finally{mod.HEAPU8.fill(0,seed,seed+48);mod._free(seed);}
      if(mod._lab_session_start())throw new Error('双方初始化失败');
      nextPass=1;publicShared=false;
      result={materials:await Promise.all(['Alice 公钥','Alice 私钥（不发送）','Alice 本地状态','Bob 公钥','Bob 私钥（不发送）','Bob 本地状态'].map((label,slot)=>material(slot,label))),passes:mod._lab_passes()};
    }else{
      if(!mod)throw new Error('请先初始化会话');
      if(data.action==='public'){
        if(publicShared)throw new Error('公钥已交换');publicShared=true;
        result={messages:await Promise.all([material(0,'Alice → Bob：公钥'),material(3,'Bob → Alice：公钥')])};
      }else if(data.action==='pass'){
        if(!publicShared||data.pass!==nextPass)throw new Error('请按顺序交换消息');
        if(mod._lab_session_pass(data.pass))throw new Error(`第 ${data.pass} 轮失败`);
        result={pass:data.pass,message:await material(5+data.pass,`msg${data.pass}`),state:await material(data.pass%2?2:5,'更新后的本地状态')};nextPass++;
      }else if(data.action==='derive'){
        if(!publicShared||mod._lab_session_derive(data.side))throw new Error('当前阶段无法派生共享密钥');
        result={side:data.side,secret:await material(10+data.side,data.side?'Bob 共享密钥':'Alice 共享密钥'),match:data.side===1?Boolean(mod._lab_session_match()):null};
      }else throw new Error('未知操作');
    }
    postMessage({action:data.action,...result,ms:performance.now()-start});
  }catch(error){mod?._lab_session_reset();postMessage({error:error?.message||'协议运行失败'});}
  finally{busy=false;}
};
