import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { gsap } from "gsap";
import { loadCharacter, disposeObject, VIEW_ANGLES, type CharacterId, type ModelMode, type ModelView } from "./character-assets";
import { createLiangzaiRig, type LiangzaiRig, type GuardianAction } from "./liangzai-rig";
import { applyInspection, rotateInspection } from "./inspection";
import { createObservatory, createStudioEnvironment } from "./observatory";
import { createArrivalState, type ArrivalPhase } from "./arrival-state";
import { createNebula, prepareMaterialization, type Nebula } from "./nebula";
import { createFrameScheduler, createShadowBudget } from "./render-scheduler";

export type HeroScene = {
  setMotion(enabled: boolean): void;
  setView(view: ModelView): void;
  setModel(mode: ModelMode): Promise<void>;
  resonate(): void;
  perform(action:GuardianAction): void;
  dispose(): void;
};

/** Only imported by a client effect. No timers, WebGL or loaders run during SSR. */
export function createHeroScene(canvas: HTMLCanvasElement, onFallback: () => void, signal: AbortSignal, onArrival: (phase: ArrivalPhase) => void = () => {}): HeroScene {
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"high-performance"});
  renderer.setClearColor(0x050a13,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
  // r186 already maps the removed PCFSoftShadowMap to PCFShadowMap.
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x050a13,.035);
  const camera=new THREE.PerspectiveCamera(35,1,.1,60);
  camera.position.set(0,4.5,11.8);camera.lookAt(0,2.55,0);
  const pmrem=new THREE.PMREMGenerator(renderer), studio=createStudioEnvironment();
  const environment=pmrem.fromScene(studio,.08);scene.environment=environment.texture;scene.environmentIntensity=.48;
  disposeObject(studio);pmrem.dispose();
  RectAreaLightUniformsLib.init();
  const area=(color:number,intensity:number,width:number,height:number,position:number[])=>{
    const light=new THREE.RectAreaLight(color,intensity,width,height);light.position.set(position[0],position[1],position[2]);light.lookAt(0,2.3,0);scene.add(light);
  };
  area(0xfff3e7,4.4,5,6,[-4,7,5]);area(0xc1d8fa,1.3,3,5,[4,4,3]);
  const key=new THREE.DirectionalLight(0xfff6e9,1.65);key.position.set(-3,7,5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=6;key.shadow.camera.bottom=-3;key.shadow.camera.far=24;
  key.shadow.normalBias=.025;key.shadow.bias=-.00008;key.shadow.radius=4;key.target.position.set(0,2,0);scene.add(key,key.target);
  const rim=new THREE.DirectionalLight(0xb8dcff,2.4);rim.position.set(2,5,-4);scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xd3deed,0x182036,.55));
  const observatory=createObservatory();scene.add(observatory.stage);
  const composer=new EffectComposer(renderer), renderPass=new RenderPass(scene,camera);
  const bloom=new UnrealBloomPass(new THREE.Vector2(512,512),.13,.45,1.8),output=new OutputPass();
  composer.addPass(renderPass);composer.addPass(bloom);composer.addPass(output);
  const actors=new Map<CharacterId,THREE.Group>(), pending=new Map<CharacterId,Promise<THREE.Group>>();
  const compiledActors=new Set<CharacterId>();
  const arrival=createArrivalState(), materializations=new Map<CharacterId,{value:number}>();
  let lastProgress=-1;
  let nebulas:Nebula[]=[createNebula(null)], modelLoaded=false, currentPhase:ArrivalPhase="nebula";
  scene.add(nebulas[0].points);
  const stageElement=canvas.parentElement!;
  const trail=Array.from({length:6},()=>new THREE.Vector4(0,0,-100,0));
  const nebulaPointer=new THREE.Vector3(),pointerTarget=new THREE.Vector3(),ripple=new THREE.Vector3(0,0,-100);
  const inputRay=new THREE.Raycaster(),inputPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0),inputPoint=new THREE.Vector3();
  let lastTrailTime=-100;
  function trackNebula(e:PointerEvent,tap=false){
    if(!enabled||arrival.phase==="formed")return;
    const r=canvas.getBoundingClientRect();
    inputRay.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    if(!inputRay.ray.intersectPlane(inputPlane,inputPoint))return;
    pointerTarget.set(inputPoint.x,inputPoint.y,1);
    if(tap)ripple.set(inputPoint.x,inputPoint.y,time);
    if(tap||time-lastTrailTime>.065){
      const previous=trail[0];
      const speed=THREE.MathUtils.clamp(Math.hypot(inputPoint.x-previous.x,inputPoint.y-previous.y)*2,.65,2.4);
      for(let i=trail.length-1;i>0;i--)trail[i].copy(trail[i-1]);
      trail[0].set(inputPoint.x,inputPoint.y,time,tap?2.5:speed);lastTrailTime=time;
    }
    invalidate();
  }
  const shockMaterial=new THREE.MeshBasicMaterial({color:0xb9eaff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const shock=new THREE.Mesh(new THREE.RingGeometry(.98,1,128),shockMaterial);
  shock.position.set(0,2.5,0);shock.quaternion.copy(camera.quaternion);scene.add(shock);
  function publishArrival(){
    const next=arrival.phase;
    if(next!==currentPhase){currentPhase=next;onArrival(next);}
    if(arrival.progress!==lastProgress){lastProgress=arrival.progress;stageElement.style.setProperty("--formation",String(Math.min(1,arrival.progress/.78)));}
  }
  let enabled=false,visible=true,disposed=false,lostContext=false,ready=true;
  let width=1,height=1,time=0,resizeFrame=0,modelRequest=0;
  let mode:ModelMode="liangzai";
  const orientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),VIEW_ANGLES.reset);
  const pose={energy:0},look={x:0,y:0};
  let rig:LiangzaiRig|null=null;
  const ctx=gsap.context(()=>{});
  let pulseTimeline:gsap.core.Timeline | null=null;
  const shadows=createShadowBudget();
  const frames=createFrameScheduler({
    requestFrame:callback=>requestAnimationFrame(callback),
    cancelFrame:handle=>cancelAnimationFrame(handle),
    canRender:()=>ready&&visible&&!document.hidden&&!disposed&&!lostContext,
    continuous:()=>enabled||arrival.active,
    fps:()=>dragging||arrival.active?60:width<600?30:45,
    render(now,delta){
      if(enabled||arrival.active)time+=delta;
      nebulaPointer.lerp(pointerTarget,1-Math.exp(-delta*6));
      arrival.step(delta);publishArrival();
      updateScene();
      renderer.shadowMap.needsUpdate=shadows.shouldUpdate(now,enabled||arrival.active);
      composer.render();
    },
  });
  const invalidate=(shadowChanged=false)=>{
    if(shadowChanged)shadows.invalidate();
    frames.invalidate();
  };
  const applyPose=()=>{
    for(const [id,actor] of actors){
      applyInspection(actor,orientation,0,mode==="duo"?(id==="liangzai"?.055:-.055):0,0);
    }
    invalidate(true);
  };
  const lookXTo=gsap.quickTo(look,"x",{duration:.22,ease:"power2.out",onUpdate:()=>invalidate(true)});
  const lookYTo=gsap.quickTo(look,"y",{duration:.22,ease:"power2.out",onUpdate:()=>invalidate(true)});
  function updateScene(){
    const p=arrival.progress, formed=arrival.phase==="formed";
    if(rig){rig.look.x=look.x;rig.look.y=look.y;rig.apply(time,enabled&&formed);}
    for(const [id,actor] of actors){
      actor.visible=modelLoaded&&(mode==="duo"||mode===id)&&p>.78;
      const material=materializations.get(id);if(material)material.value=THREE.MathUtils.smoothstep(p,.78,1);
    }
    for(const nebula of nebulas){nebula.interact(trail,nebulaPointer,ripple);nebula.update(time,p,height,enabled);}
    const climax=Math.sin(THREE.MathUtils.clamp((p-.78)/.22,0,1)*Math.PI);
    shock.visible=enabled&&p>.78&&p<1;
    shock.scale.setScalar(.5+THREE.MathUtils.clamp((p-.78)/.22,0,1)*6);
    shockMaterial.opacity=climax*.55;
    bloom.strength=.13+(enabled?climax*.6:0);
    renderer.toneMappingExposure=.96+(enabled?climax*.16:0);
    camera.zoom=(mode==="duo"?.94:1)*(1+(enabled?Math.sin(p*Math.PI)*.065:0));camera.updateProjectionMatrix();
    observatory.orbit.visible=p>.45;
    observatory.glow.emissive.set(mode==="nailong"?0xffbc62:0x6fbee7);
    shockMaterial.color.set(mode==="nailong"?0xffd68f:0xb9eaff);
    for(const actor of actors.values())if(actor.visible)actor.position.y=.092;
    observatory.stars.rotation.y=time*.018;
    observatory.glow.emissiveIntensity=1.05+pose.energy*.45+climax*2;
    (observatory.pulse.material as THREE.MeshBasicMaterial).opacity=Math.max(pose.energy*.4,climax*.8);
    observatory.pulse.scale.setScalar(1+pose.energy*.075);
  }
  const sync=()=>{
    if(document.hidden||!visible){pointerTarget.set(0,0,0);arrival.hold(false);dragging=false;canvas.classList.remove("is-dragging");}
    frames.sync();
    invalidate();
  };
  const resize=()=>{
    if(disposed)return;
    const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;
    if(Math.abs(width-r.width)<.5&&Math.abs(height-r.height)<.5)return;
    width=r.width;height=r.height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,width<600?1.15:1.5));renderer.setSize(width,height,false);composer.setSize(width,height);
    // Composer intentionally stays at DPR 1. Only the soft glow is downsampled.
    // Apply after composer.setSize(), which otherwise overwrites pass sizes.
    bloom.setSize(Math.max(1,Math.round(width*.5)),Math.max(1,Math.round(height*.5)));
    camera.aspect=width/height;
    // Keep the broad pedestal and both silhouettes inside portrait screens.
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(35/2))/Math.min(1,width/height/.9)));
    camera.updateProjectionMatrix();bloom.enabled=width>=600;invalidate();
  };
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);});observer.observe(canvas);
  const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.025});visibility.observe(canvas);
  const ensure=(id:CharacterId)=>{
    if(!pending.has(id))pending.set(id,loadCharacter(id,signal).then(actor=>{if(disposed){disposeObject(actor);throw new DOMException("Scene disposed","AbortError");}if(id==="liangzai")rig=createLiangzaiRig(actor);materializations.set(id,prepareMaterialization(actor));actors.set(id,actor);actor.visible=false;scene.add(actor);return actor;}).catch(error=>{pending.delete(id);throw error;}));
    return pending.get(id)!;
  };
  let viewTween:gsap.core.Tween|null=null;
  function tweenOrientation(target:THREE.Quaternion,duration:number){
    const from=orientation.clone(),progress={value:0};
    return gsap.to(progress,{value:1,duration,ease:"power2.out",onUpdate:()=>{orientation.slerpQuaternions(from,target,progress.value);applyPose();}});
  }
  function setView(view:ModelView){
    coast?.kill();viewTween?.kill();pulseTimeline?.kill();
    pose.energy=0;rig?.reset();look.x=look.y=0;lookXTo.tween.pause();lookYTo.tween.pause();
    const target=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),VIEW_ANGLES[view]);
    if(enabled)viewTween=tweenOrientation(target,.32);
    else{orientation.copy(target);applyPose();}
  }
  function perform(action:GuardianAction){
    if(arrival.phase!=="formed"||!enabled||disposed||lostContext||!rig||!actors.get("liangzai")?.visible)return;
    coast?.kill();viewTween?.kill();pulseTimeline?.kill();rig.reset();pose.energy=0;
    const p=rig.pose,neutral={...p};
    ctx.add(()=>{
      const timeline=gsap.timeline({onUpdate:()=>invalidate(true),defaults:{ease:"sine.inOut"}});
      pulseTimeline=timeline;
      if(action==="wave")timeline.to(p,{leftArm:-1.35,headRoll:-.05,duration:.45}).to(p,{leftWrist:-.7,duration:.18,repeat:5,yoyo:true});
      else if(action==="nod")timeline.to(p,{headPitch:.2,duration:.3}).to(p,{headPitch:-.08,duration:.25,repeat:3,yoyo:true});
      else if(action==="look")timeline.to(p,{headYaw:-.5,antenna:.12,duration:.5}).to(p,{headYaw:.5,antenna:-.12,duration:1});
      else if(action==="stretch")timeline.to(p,{leftArm:-1.45,rightArm:1.45,leftWrist:.3,rightWrist:-.3,headPitch:-.1,duration:.7}).to(p,{headPitch:0,duration:.35});
      else if(action==="march")timeline.to(p,{leftLeg:.25,rightLeg:-.2,leftFoot:-.17,rightFoot:.1,leftArmX:-.18,rightArmX:.18,duration:.3}).to(p,{leftLeg:-.2,rightLeg:.25,leftFoot:.1,rightFoot:-.17,leftArmX:.18,rightArmX:-.18,duration:.35,repeat:3,yoyo:true});
      else if(action==="antenna")timeline.to(p,{antenna:.19,headPitch:-.08,duration:.22}).to(p,{antenna:-.19,duration:.2,repeat:5,yoyo:true}).to(pose,{energy:.85,duration:.5},0);
      else timeline.to(p,{blink:.06,duration:.1,repeat:3,yoyo:true});
      timeline.to(p,{...neutral,duration:.45}).to(pose,{energy:0,duration:.35},"<");
    });
  }
  function resonate(character?:CharacterId){
    if(arrival.phase!=="formed"||disposed||lostContext||!enabled)return;
    if(character!=="nailong"&&rig&&actors.get("liangzai")?.visible){perform("antenna");return;}
    pulseTimeline?.kill();
    ctx.add(()=>{pulseTimeline=gsap.timeline({onUpdate:()=>invalidate(true)}).to(pose,{energy:1,duration:.5}).to(pose,{energy:0,duration:1});});
  }
  let dragging=false,distance=0,lastX=0,lastY=0,lastMove=0,velocityX=0,velocityY=0;
  let coast:gsap.core.Tween|null=null;
  const down=(e:PointerEvent)=>{
    if(e.button!==0||!e.isPrimary)return;
    if(arrival.phase!=="formed"){
      trackNebula(e,true);
      if(!modelLoaded)return;
      e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
      arrival.hold(true);sync();return;
    }
    coast?.kill();viewTween?.kill();pulseTimeline?.kill();
    lookXTo.tween.pause();lookYTo.tween.pause();
    look.x=look.y=0;rig?.reset();pose.energy=0;
    dragging=true;distance=0;velocityX=velocityY=0;lastMove=performance.now();lastX=e.clientX;lastY=e.clientY;
    canvas.setPointerCapture(e.pointerId);canvas.classList.add("is-dragging");applyPose();
  };
  const move=(e:PointerEvent)=>{
    if(!e.isPrimary)return;
    if(arrival.phase!=="formed"){trackNebula(e);return;}
    if(dragging){
      const now=performance.now(),dx=e.clientX-lastX,dy=e.clientY-lastY;
      velocityX=dx/Math.max(8,now-lastMove);velocityY=dy/Math.max(8,now-lastMove);
      distance+=Math.abs(dx)+Math.abs(dy);lastX=e.clientX;lastY=e.clientY;lastMove=now;
      // Direct manipulation: no tween may lag behind or fight the pointer.
      rotateInspection(orientation,dx,dy,width,height,camera.quaternion);applyPose();
    }else if(enabled&&e.pointerType==="mouse"){
      const r=canvas.getBoundingClientRect();lookXTo(((e.clientX-r.left)/r.width-.5)*2);lookYTo(((e.clientY-r.top)/r.height-.5)*2);
    }
  };
  const raycaster=new THREE.Raycaster();
  const up=(e:PointerEvent)=>{
    if(!e.isPrimary)return;
    arrival.hold(false);sync();
    if(!dragging){if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);return;}
    dragging=false;canvas.classList.remove("is-dragging");if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(distance>=8&&enabled&&performance.now()-lastMove<70){
      const target=orientation.clone();
      rotateInspection(target,THREE.MathUtils.clamp(velocityX*55,-width*.04,width*.04),THREE.MathUtils.clamp(velocityY*55,-height*.04,height*.04),width,height,camera.quaternion);
      coast=tweenOrientation(target,.22);
    }
    if(distance<8){scene.updateMatrixWorld(true);const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
      const actor=actors.get("liangzai"),hit=actor?.visible?raycaster.intersectObject(actor,true)[0]:null;
      if(hit){
        let node:THREE.Object3D|null=hit.object,action:GuardianAction="stretch";
        while(node){
          if(node.name==="joint_antenna"){action="antenna";break;}
          if(/joint_.*Eye/.test(node.name)){action="blink";break;}
          if(/joint_.*(Arm|Hand)/.test(node.name)){action="wave";break;}
          if(/joint_.*(Leg|Foot)/.test(node.name)){action="march";break;}
          if(node.name==="joint_head"){action="nod";break;}
          node=node.parent;
        }
        perform(action);
      }else{const dragon=actors.get("nailong");if(dragon?.visible&&raycaster.intersectObject(dragon,true).length)resonate("nailong");}}
  };
  const cancel=()=>{arrival.hold(false);sync();coast?.kill();dragging=false;canvas.classList.remove("is-dragging");};
  const leave=()=>{pointerTarget.set(0,0,0);if(enabled&&!dragging&&arrival.phase==="formed"){lookXTo(0);lookYTo(0);}};
  const keyboard=(e:KeyboardEvent)=>{
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","Enter"," "].includes(e.key))return;e.preventDefault();
    if(arrival.phase!=="formed"){
      if(modelLoaded&&(e.key==="Enter"||e.key===" ")){arrival.hold(true);sync();}return;
    }
    if(e.key==="Enter"||e.key===" "){if(!e.repeat)resonate();return;}
    if(e.key==="Home")setView("reset");
    else{coast?.kill();viewTween?.kill();rotateInspection(orientation,e.key==="ArrowLeft"?-width/24:e.key==="ArrowRight"?width/24:0,e.key==="ArrowUp"?-height/24:e.key==="ArrowDown"?height/24:0,width,height,camera.quaternion);applyPose();}
  };
  const lost=(e:Event)=>{e.preventDefault();lostContext=true;sync();onFallback();};
  const keyup=(e:KeyboardEvent)=>{if(e.key==="Enter"||e.key===" "){arrival.hold(false);sync();}};
  const blur=()=>{pointerTarget.set(0,0,0);cancel();};
  const lostCapture=()=>{if(dragging||arrival.phase!=="formed")cancel();};
  const listeners={keyup,blur,lostpointercapture:lostCapture,pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,pointerleave:leave,keydown:keyboard,webglcontextlost:lost};
  for(const [type,listener] of Object.entries(listeners))canvas.addEventListener(type,listener as EventListener);
  document.addEventListener("visibilitychange",sync);
  function dispose(){
    if(disposed)return;disposed=true;modelRequest++;coast?.kill();viewTween?.kill();frames.dispose();ctx.revert();lookXTo.tween.kill();lookYTo.tween.kill();rig=null;
    observer.disconnect();visibility.disconnect();cancelAnimationFrame(resizeFrame);document.removeEventListener("visibilitychange",sync);signal.removeEventListener("abort",dispose);
    for(const [type,listener] of Object.entries(listeners))canvas.removeEventListener(type,listener as EventListener);
    for(const nebula of nebulas)nebula.dispose();nebulas=[];materializations.clear();stageElement.style.removeProperty("--formation");
    disposeObject(scene);actors.clear();pending.clear();compiledActors.clear();environment.dispose();key.shadow.dispose();bloom.dispose();output.dispose();renderPass.dispose();composer.dispose();renderer.dispose();renderer.forceContextLoss();
  }
  signal.addEventListener("abort",dispose,{once:true});
  resize();
  return {
    setMotion(value){enabled=value;if(!value){pointerTarget.set(0,0,0);nebulaPointer.set(0,0,0);ripple.z=-100;for(const point of trail)point.w=0;coast?.kill();viewTween?.kill();pulseTimeline?.kill();lookXTo.tween.pause();lookYTo.tween.pause();look.x=look.y=0;rig?.reset();pose.energy=0;applyPose();}sync();},
    setView,resonate,perform,dispose,
    async setModel(next){
      if(disposed||lostContext)throw new Error("3D unavailable");
      const request=++modelRequest,ids:CharacterId[]=next==="duo"?["liangzai","nailong"]:[next];
      modelLoaded=false;arrival.reset();publishArrival();
      pointerTarget.set(0,0,0);nebulaPointer.set(0,0,0);ripple.set(0,0,-100);lastTrailTime=-100;
      for(const point of trail)point.set(0,0,-100,0);
      coast?.kill();viewTween?.kill();pulseTimeline?.kill();rig?.reset();cancel();
      lookXTo.tween.pause();lookYTo.tween.pause();look.x=look.y=0;pose.energy=0;
      mode=next;
      for(const actor of actors.values())actor.visible=false;
      for(const nebula of nebulas)nebula.dispose();
      nebulas=[createNebula(null,next==="nailong"?"nailong":"liangzai")];scene.add(nebulas[0].points);
      invalidate(true);frames.sync();
      let timer:ReturnType<typeof setTimeout>|undefined;
      try{
        await Promise.all(ids.map(ensure));
        if(disposed||request!==modelRequest)return;
        mode=next;
        for(const [id,actor] of actors){
          actor.visible=ids.includes(id);actor.scale.setScalar(next==="duo"?.87:1);
          actor.position.set(next==="duo"?(id==="liangzai"?-1.24:1.22):0,.092,next==="duo"?(id==="nailong"?.12:0):0);
        }
        // Capture a neutral, front-facing surface before enabling direct inspection.
        orientation.setFromAxisAngle(new THREE.Vector3(0,1,0),VIEW_ANGLES.reset);rig?.reset();applyPose();
        for(const nebula of nebulas)nebula.dispose();
        nebulas=ids.map(id=>createNebula(actors.get(id)!,id,next==="duo"?12000:18000));
        for(const nebula of nebulas)scene.add(nebula.points);
        camera.zoom=next==="duo"?.94:1;camera.updateProjectionMatrix();
        if(ids.some(id=>!compiledActors.has(id))){
          // Compile the same linear/HDR variant that RenderPass will actually use.
          // Restore the target synchronously; another selection may arrive while awaiting.
          const previousTarget=renderer.getRenderTarget();
          let compiled:Promise<THREE.Object3D>;
          try{renderer.setRenderTarget(composer.readBuffer);compiled=renderer.compileAsync(scene,camera);}
          finally{renderer.setRenderTarget(previousTarget);}
          await Promise.race([compiled,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("3D shader timeout")),10000);})]);
          if(disposed||request!==modelRequest)return;
          ids.forEach(id=>compiledActors.add(id));
        }
        modelLoaded=true;ready=true;updateScene();
        invalidate(true);
      }catch(error){
        // A failed older request must not replace a newer working selection with fallback.
        if(disposed||request!==modelRequest)return;
        ready=false;
        throw error;
      }finally{
        clearTimeout(timer);
        if(request===modelRequest){frames.sync();}
      }
    },
  };
}
