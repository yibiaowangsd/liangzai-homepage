// Presentation helpers share the existing worker and field state; no key is persisted.
const $ = id => document.getElementById(id);
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
export function setupUsability(api) {
  const workspace = document.querySelector('.practice-content');
  const modeButtons = [...document.querySelectorAll('[data-flow-mode]')];
  let mode = 'guided', selection = {}, undo = null;
  const fingerprints = new Map();
  function selectMode(value) {
    mode=value; workspace.dataset.mode=value;
    modeButtons.forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.flowMode===mode));button.tabIndex=button.dataset.flowMode===mode?0:-1;});
    update(api.state());
  }
  modeButtons.forEach((button,index)=>{
    button.onclick=()=>selectMode(button.dataset.flowMode);
    button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-index;modeButtons[next].focus();selectMode(modeButtons[next].dataset.flowMode);};
  });
  $('guided-next').onclick=()=>document.querySelector('.dialogue:not(.hidden) .is-next')?.click();
  $('runnable-only').onchange=api.renderSidebar;
  function discardUndo() { if (undo?.aliceSecret) undo.aliceSecret.fill(0); undo=null; $('undo-clear').hidden=true; }
  function confirmChange() {
    const populated=[...document.querySelectorAll('[data-field]')].some(input=>input.value.trim()) || ($('sign-message').value && $('sign-message').value !== 'This is a test message.');
    return !populated || window.confirm('Changing algorithms or parameters clears current inputs and results. Continue?');
  }
  document.addEventListener('click', event=>{
    const target=event.target.closest('[data-lab-tab],[data-library-shortcut],[data-select-family],[data-select-library]');
    if(!target || target.disabled)return;
    const changes=target.dataset.labTab ? target.getAttribute('aria-selected')!=='true' : target.dataset.selectFamily ? target.dataset.selectFamily!==$('family').value : (target.dataset.libraryShortcut||target.dataset.selectLibrary)!==$('library').value;
    if(changes && !confirmChange()){event.preventDefault();event.stopImmediatePropagation();return;}
    if(changes)discardUndo();
  },true);
  document.addEventListener('change',event=>{
    const control=event.target;
    if(!['library','family','variant','hash'].includes(control.id) || event.detail?.internal)return;
    if(!confirmChange()){control.value=selection[control.id];event.stopImmediatePropagation();return;}
    discardUndo();
  },true);
  $('undo-clear').onclick=()=>{if(!undo)return;const snapshot=undo;undo=null;$('undo-clear').hidden=true;api.restore(snapshot);snapshot.aliceSecret?.fill(0);};
  document.addEventListener('input',event=>{if(event.target.matches('[data-field],.message-input'))discardUndo();});
  document.addEventListener('click',event=>{if(event.target.closest('[data-work],#run-example,#tamper-one-bit'))discardUndo();},true);
  for(const input of document.querySelectorAll('[data-field]')) {
    const material=$('material-'+input.id), tools=material.querySelector('.field-tools');
    const label=input.labels?.[0]?.textContent.replace(/\s+/g,' ').trim() || 'Material';
    const foot=material.querySelector('.material-foot');
    const format=document.createElement('span');format.className='field-format';format.textContent='HEX / Base64';
    const fingerprint=document.createElement('code');fingerprint.className='field-fingerprint';fingerprint.title='First 8 bytes of SHA-256 of the complete material';
    const error=document.createElement('p');error.className='field-error';error.id='error-'+input.id;error.setAttribute('aria-live','polite');
    input.setAttribute('aria-describedby',input.getAttribute('aria-describedby')+' '+error.id+' input-safety');
    foot.append(format,fingerprint);material.append(error);
    const expand=document.createElement('button');expand.type='button';expand.className='tool field-expand';expand.textContent='Expand';expand.setAttribute('aria-label','Expand'+label);expand.setAttribute('aria-expanded','false');
    expand.onclick=()=>{const expanded=input.classList.toggle('is-expanded');expand.textContent=expanded?'Collapse':'Expand';expand.setAttribute('aria-expanded',String(expanded));};tools.append(expand);
    if(input.id.endsWith('-private')) {
      const mask=document.createElement('p');mask.className='private-mask';mask.textContent='Private key hidden';input.before(mask);input.hidden=true;
      const reveal=document.createElement('button');reveal.type='button';reveal.className='tool';reveal.dataset.privateToggle=input.id;reveal.textContent='Show';reveal.setAttribute('aria-label','Show'+label);reveal.setAttribute('aria-expanded','false');
      reveal.onclick=()=>{input.hidden=!input.hidden;mask.hidden=!input.hidden;reveal.textContent=input.hidden?'Show':'Hide';reveal.setAttribute('aria-expanded',String(!input.hidden));reveal.setAttribute('aria-label',(input.hidden?'Show':'Hide')+label);};tools.append(reveal);
    }
    const file=material.querySelector('[data-import]'),importLabel=file?.closest('label');
    if(!file)continue;
    importLabel.firstChild.textContent='↥';importLabel.title='Import'+label;file.setAttribute('aria-label','Import'+label);
    material.addEventListener('dragover',event=>{event.preventDefault();material.classList.add('drop-target');});
    material.addEventListener('dragleave',()=>material.classList.remove('drop-target'));
    material.addEventListener('drop',event=>{event.preventDefault();material.classList.remove('drop-target');if(api.state().busy)return;const dropped=event.dataTransfer.files[0];if(dropped)api.importFile(file,dropped);});
  }
  document.querySelectorAll('[data-copy]').forEach(button=>{
    const target=$(button.dataset.copy);const label=target.labels?.[0]?.textContent || (button.dataset.copy==='kem-bob-secret'?'Alice Shared secret':'Bob Shared secret');
    button.textContent='⧉';button.title='Copy'+label;button.setAttribute('aria-label','Copy'+label);
  });
  function update(state) {
    selection=Object.fromEntries(['library','family','variant','hash'].map(id=>[id,$(id).value]));
    const special=!$('candidate-workbench').classList.contains('hidden');
    workspace.dataset.mode=special ? 'candidate' : mode;
    $('flow-modes').hidden=special;
    const next=document.querySelector('.dialogue:not(.hidden) .is-next');
    const completed=state.outcome==='pass',failed=state.outcome==='fail';
    const stage=[...$('step-list').children].filter(item=>item.classList.contains('complete')).length;
    $('lab-mini-name').textContent=state.name;
    $('lab-mini-progress').textContent=(failed?'✕ Failed':completed?'✓ Complete':state.busy||stage>0?'◌ In progress':'○ Not started')+' · '+Math.min(stage,5)+'/5';
    $('guided-next').disabled=!next||next.disabled||special;
    $('guided-next').textContent=completed?'✓ Complete':next?.textContent || 'Waiting for the module';
    $('guided-next').title=next?.title || '';
    $('guided-alice').textContent=state.kem?'Alice · Generate key pair / Decapsulate':'Alice · Generate key pair / Signature';
    $('guided-bob').textContent=state.kem?'Bob · Encapsulate':'Bob · Verify signature';
    $('guided-stage').textContent=$('guide-title').textContent;
    $('guided-detail').textContent=$('guide-detail').textContent;
    const transmission=$('guided-transmissions');transmission.replaceChildren();
    for(const route of document.querySelectorAll('.dialogue:not(.hidden) .route')) {
      const entry=document.createElement('li');entry.textContent=route.querySelector('.packet-head strong').textContent+' · '+route.querySelector('.route-state').textContent;transmission.append(entry);
    }
    $('tamper-one-bit').hidden=special;
    $('tamper-one-bit').textContent=state.kem?'Flip 1 ciphertext bit':'Flip 1 message bit';
    $('tamper-one-bit').disabled=state.busy || !state.sizes || (state.kem ? !$('kem-bob-cipher').value || !$('kem-private').value : !$('verify-signature').value);
    $('hash-readonly').hidden=$('hash').options.length!==1||$('library').value==='ngcc';
    $('hash-readonly').textContent='Hash function：'+$('hash').value.toUpperCase();
    if($('hash').options.length===1)$('hash-field').classList.add('hidden');
    $('parameter-materials').textContent=state.sizes ? `Public key ${state.sizes.pk} B · Private key ${state.sizes.sk} B · ${state.kem?'Ciphertext':'Signature'} ${state.sizes.out} B${state.kem?' · Shared secret '+state.sizes.ss+' B':''}` : 'Preparing parameter sizes';
    for(const input of document.querySelectorAll('[data-field]')) {
      const material=$('material-'+input.id),raw=input.value.trim(),error=material.querySelector('.field-error'),format=material.querySelector('.field-format'),fingerprint=material.querySelector('.field-fingerprint');
      const expected=state.sizes ? api.expectedSize(input.id) : null;
      const expand=material.querySelector('.field-expand');expand.hidden=raw.length<256;
      if(!raw||!expected){fingerprints.delete(input.id);error.textContent='';fingerprint.textContent='';format.textContent='HEX / Base64';input.removeAttribute('aria-invalid');continue;}
      try {
        const bytes=api.decode(raw,expected,input.labels?.[0]?.textContent.replace(/^(pk|sk|ct|sig)/,'').replace('Local only','')||'Material');
        format.textContent=raw.replace(/\b0x/gi,'').replace(/[\s:,]/g,'').toLowerCase()===hex(bytes)?'HEX':'Base64';
        error.textContent='';input.removeAttribute('aria-invalid');material.classList.remove('invalid');
        if(fingerprints.get(input.id)!==raw){fingerprints.set(input.id,raw);fingerprint.textContent='Computing fingerprint';crypto.subtle.digest('SHA-256',bytes).then(hash=>{if(input.value.trim()===raw)fingerprint.textContent='SHA-256 '+hex(new Uint8Array(hash).slice(0,8));}).catch(()=>{fingerprint.textContent='Fingerprint unavailable';});}
        if(input.id.endsWith('-private'))bytes.fill(0);
      } catch(cause){error.textContent=cause.message;input.setAttribute('aria-invalid','true');material.classList.add('invalid');fingerprint.textContent='';}
    }
    const result=$('manual-result');result.dataset.status=failed?'failed':completed?'complete':stage?'progress':'idle';
    if(completed && state.kem)$('manual-summary').textContent='✓ Shared secrets match · '+state.sizes.ss+' B';
    else if(failed && state.kem)$('manual-summary').textContent='✕ Shared secrets differ · '+state.sizes.ss+' B';
    else if(completed)$('manual-summary').textContent='✓ Complete · SignatureValid';
    else if(failed)$('manual-summary').textContent='✕ Failed · SignatureInvalid';
    const left=$('kem-bob-secret').textContent.trim(),right=$('kem-alice-secret').textContent.trim();
    const show=state.kem&&/^[a-f0-9]+$/i.test(left)&&/^[a-f0-9]+$/i.test(right);
    $('secret-comparison').hidden=!show;
    if(show)for(const [id,text,other] of [['compare-alice',left,right],['compare-bob',right,left]]){
      const code=$(id);code.replaceChildren();
      for(let i=0;i<text.length;i+=2){const byte=document.createElement('span');byte.textContent=text.slice(i,i+2)+' ';if(text.slice(i,i+2)!==other.slice(i,i+2)){byte.className='different-byte';byte.title='This byte differs';}code.append(byte);}
    }
    const timings=state.timings.filter(item=>item.ms!==null);
    const max=Math.max(1,...timings.map(item=>item.ms));
    $('timing-bars').replaceChildren(...timings.map(item=>{const row=document.createElement('div'),label=document.createElement('span'),meter=document.createElement('meter'),value=document.createElement('span');label.textContent=item.label;meter.min=0;meter.max=max;meter.value=item.ms;meter.setAttribute('aria-label',item.label+'Duration');value.textContent=item.ms.toFixed(2)+' ms';row.append(label,meter,value);return row;}));
  }
  function hidePrivate() {
    document.querySelectorAll('[data-private-toggle]').forEach(button=>{
      const input=$(button.dataset.privateToggle);input.hidden=true;input.previousElementSibling.hidden=false;button.textContent='Show';button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','ShowPrivate key');
    });
  }
  return { update, hidePrivate, beforeClear(){discardUndo();undo=api.snapshot();$('undo-clear').hidden=false;},discardUndo };
}
