import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { gsap } from "gsap";
import { loadCharacter, disposeObject, VIEW_ANGLES, type CharacterId, type ModelMode, type ModelView } from "./character-assets";
import { applyInspection, rotateInspection } from "./inspection";
import { createObservatory, createStudioEnvironment } from "./observatory";
import { createFrameScheduler, createShadowBudget } from "./render-scheduler";

export type HeroScene = {
  setMotion(enabled: boolean): void;
  setView(view: ModelView): void;
  setModel(mode: ModelMode): Promise<void>;
  resonate(): void;
  perform(action:"greet"|"spin"|"jump"): void;
  dispose(): void;
};

/** Only imported by a client effect. No timers, WebGL or loaders run during SSR. */
export function createHeroScene(canvas: HTMLCanvasElement, onFallback: () => void, signal: AbortSignal): HeroScene {
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
  let enabled=false,visible=true,disposed=false,lostContext=false,ready=false,preparing=0;
  let width=1,height=1,time=0,resizeFrame=0,modelRequest=0;
  let mode:ModelMode="liangzai",activeView:ModelView="reset";
  const orientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),VIEW_ANGLES.reset);
  const pose={yaw:0,pitch:0,gaze:0,lift:0,energy:0,bow:0,roll:0};
  const ctx=gsap.context(()=>{});
  let pulseTimeline:gsap.core.Timeline | null=null;
  const shadows=createShadowBudget();
  const frames=createFrameScheduler({
    requestFrame:callback=>requestAnimationFrame(callback),
    cancelFrame:handle=>cancelAnimationFrame(handle),
    canRender:()=>ready&&!preparing&&visible&&!document.hidden&&!disposed&&!lostContext,
    continuous:()=>enabled,
    fps:()=>dragging?60:width<600?30:45,
    render(now,delta){
      if(enabled)time+=delta;
      updateScene();
      renderer.shadowMap.needsUpdate=shadows.shouldUpdate(now,enabled);
      composer.render();
    },
  });
  const invalidate=(shadowChanged=false)=>{
    if(shadowChanged)shadows.invalidate();
    frames.invalidate();
  };
  const applyPose=()=>{
    for(const [id,actor] of actors){
      applyInspection(actor,orientation,pose.pitch+pose.bow,pose.yaw+(mode==="duo"?(id==="liangzai"?.055:-.055):0),pose.gaze+pose.roll);
    }
    invalidate(true);
  };
  const gazeTo=gsap.quickTo(pose,"gaze",{duration:.8,ease:"power3.out",onUpdate:applyPose});
  function updateScene(){

    for(const [id,actor] of actors)if(actor.visible)actor.position.y=.092+pose.lift+(enabled?Math.sin(time*1.05+(id==="nailong"?.7:0))*.012:0);
    observatory.stars.rotation.y=time*.018;
    observatory.glow.emissiveIntensity=1.05+pose.energy*.45;
    (observatory.pulse.material as THREE.MeshBasicMaterial).opacity=pose.energy*.4;
    observatory.pulse.scale.setScalar(1+pose.energy*.075);
  }
  const sync=()=>{
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
    if(!pending.has(id))pending.set(id,loadCharacter(id,signal).then(actor=>{if(disposed){disposeObject(actor);throw new DOMException("Scene disposed","AbortError");}actors.set(id,actor);actor.visible=false;scene.add(actor);return actor;}).catch(error=>{pending.delete(id);throw error;}));
    return pending.get(id)!;
  };
  let viewTween:gsap.core.Tween|null=null;
  function tweenOrientation(target:THREE.Quaternion,duration:number){
    const from=orientation.clone(),progress={value:0};
    return gsap.to(progress,{value:1,duration,ease:"power2.out",onUpdate:()=>{orientation.slerpQuaternions(from,target,progress.value);applyPose();}});
  }
  function setView(view:ModelView){
    coast?.kill();viewTween?.kill();pulseTimeline?.kill();activeView=view;
    pose.yaw=pose.pitch=pose.gaze=pose.bow=pose.roll=pose.lift=pose.energy=0;gazeTo.tween.pause();
    const target=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),VIEW_ANGLES[view]);
    if(enabled)viewTween=tweenOrientation(target,.32);
    else{orientation.copy(target);applyPose();}
  }
  function perform(action:"greet"|"spin"|"jump"){
    if(!enabled||disposed||lostContext)return;
    coast?.kill();viewTween?.kill();pulseTimeline?.kill();pose.lift=pose.energy=pose.bow=pose.roll=0;
    gazeTo.tween.pause();
    ctx.add(()=>{
      const timeline=gsap.timeline({onUpdate:()=>{applyPose();invalidate(true);}});
      pulseTimeline=timeline;
      if(action==="spin")timeline.to(pose,{yaw:pose.yaw+Math.PI*2,energy:1,duration:1.6,ease:"power2.inOut"}).to(pose,{energy:0,duration:.5});
      else if(action==="greet")timeline.to(pose,{bow:.28,energy:.6,duration:.4}).to(pose,{bow:0,roll:.1,duration:.35}).to(pose,{roll:-.1,duration:.3,repeat:2,yoyo:true}).to(pose,{roll:0,energy:0,duration:.4});
      else timeline.to(pose,{bow:-.08,lift:.7,energy:1,duration:.45,ease:"power2.out"}).to(pose,{bow:.12,lift:0,duration:.5,ease:"bounce.out"}).to(pose,{bow:0,energy:0,duration:.4});
    });
  }
  function resonate(){
    if(disposed||lostContext)return;
    pulseTimeline?.kill();pose.lift=pose.energy=0;
    if(!enabled){invalidate();return;}
    ctx.add(()=>{
      pulseTimeline=gsap.timeline({onUpdate:()=>invalidate(true)})
        .to(pose,{lift:.11,energy:1,duration:.55,ease:"sine.out"})
        .to(pose,{lift:0,energy:0,bow:0,roll:0,duration:1.2,ease:"sine.inOut"});
    });
  }
  let dragging=false,distance=0,lastX=0,lastY=0,lastMove=0,velocityX=0,velocityY=0;
  let coast:gsap.core.Tween|null=null;
  const down=(e:PointerEvent)=>{
    if(e.button!==0)return;
    coast?.kill();viewTween?.kill();pulseTimeline?.kill();
    gazeTo.tween.pause();
    pose.lift=pose.energy=pose.bow=pose.roll=pose.gaze=0;
    dragging=true;distance=0;velocityX=velocityY=0;lastMove=performance.now();lastX=e.clientX;lastY=e.clientY;
    canvas.setPointerCapture(e.pointerId);canvas.classList.add("is-dragging");applyPose();
  };
  const move=(e:PointerEvent)=>{
    if(dragging){
      const now=performance.now(),dx=e.clientX-lastX,dy=e.clientY-lastY;
      velocityX=dx/Math.max(8,now-lastMove);velocityY=dy/Math.max(8,now-lastMove);
      distance+=Math.abs(dx)+Math.abs(dy);lastX=e.clientX;lastY=e.clientY;lastMove=now;
      // Direct manipulation: no tween may lag behind or fight the pointer.
      rotateInspection(orientation,dx,dy,width,height,camera.quaternion);applyPose();
    }else if(enabled&&e.pointerType==="mouse"){
      const r=canvas.getBoundingClientRect();gazeTo(((e.clientX-r.left)/r.width-.5)*-.07);
    }
  };
  const raycaster=new THREE.Raycaster();
  const up=(e:PointerEvent)=>{
    if(!dragging)return;dragging=false;canvas.classList.remove("is-dragging");if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(distance>=8&&enabled&&performance.now()-lastMove<70){
      const target=orientation.clone();
      rotateInspection(target,THREE.MathUtils.clamp(velocityX*55,-width*.04,width*.04),THREE.MathUtils.clamp(velocityY*55,-height*.04,height*.04),width,height,camera.quaternion);
      coast=tweenOrientation(target,.22);
    }
    if(distance<8){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
      if([...actors.values()].some(actor=>actor.visible&&raycaster.intersectObject(actor,true).length))perform("jump");}
  };
  const cancel=()=>{coast?.kill();dragging=false;canvas.classList.remove("is-dragging");};
  const leave=()=>{if(enabled&&!dragging){gazeTo(0);}};
  const keyboard=(e:KeyboardEvent)=>{
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","Enter"," "].includes(e.key))return;e.preventDefault();
    if(e.key==="Enter"||e.key===" ")resonate();else if(e.key==="Home")setView("reset");
    else{coast?.kill();viewTween?.kill();rotateInspection(orientation,e.key==="ArrowLeft"?-width/24:e.key==="ArrowRight"?width/24:0,e.key==="ArrowUp"?-height/24:e.key==="ArrowDown"?height/24:0,width,height,camera.quaternion);applyPose();}
  };
  const lost=(e:Event)=>{e.preventDefault();lostContext=true;sync();onFallback();};
  const listeners={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,pointerleave:leave,keydown:keyboard,webglcontextlost:lost};
  for(const [type,listener] of Object.entries(listeners))canvas.addEventListener(type,listener as EventListener);
  document.addEventListener("visibilitychange",sync);
  function dispose(){
    if(disposed)return;disposed=true;modelRequest++;coast?.kill();viewTween?.kill();frames.dispose();ctx.revert();gazeTo.tween.kill();
    observer.disconnect();visibility.disconnect();cancelAnimationFrame(resizeFrame);document.removeEventListener("visibilitychange",sync);signal.removeEventListener("abort",dispose);
    for(const [type,listener] of Object.entries(listeners))canvas.removeEventListener(type,listener as EventListener);
    disposeObject(scene);actors.clear();pending.clear();compiledActors.clear();environment.dispose();key.shadow.dispose();bloom.dispose();output.dispose();renderPass.dispose();composer.dispose();renderer.dispose();renderer.forceContextLoss();
  }
  signal.addEventListener("abort",dispose,{once:true});
  resize();
  return {
    setMotion(value){enabled=value;if(!value){coast?.kill();viewTween?.kill();pulseTimeline?.progress(1).kill();gazeTo.tween.pause();pose.pitch=pose.gaze=pose.lift=pose.energy=pose.bow=pose.roll=0;applyPose();}sync();},
    setView,resonate,perform,dispose,
    async setModel(next){
      if(disposed||lostContext)throw new Error("3D unavailable");
      const request=++modelRequest,ids:CharacterId[]=next==="duo"?["liangzai","nailong"]:[next];
      preparing=request;frames.sync();
      let timer:ReturnType<typeof setTimeout>|undefined;
      try{
        await Promise.all(ids.map(ensure));
        if(disposed||request!==modelRequest)return;
        mode=next;
        for(const [id,actor] of actors){
          actor.visible=ids.includes(id);actor.scale.setScalar(next==="duo"?.87:1);
          actor.position.set(next==="duo"?(id==="liangzai"?-1.24:1.22):0,.092,next==="duo"?(id==="nailong"?.12:0):0);
        }
        camera.zoom=next==="duo"?.94:1;camera.updateProjectionMatrix();setView(activeView);updateScene();applyPose();
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
        ready=true;
        invalidate(true);
      }catch(error){
        // A failed older request must not replace a newer working selection with fallback.
        if(disposed||request!==modelRequest)return;
        ready=false;
        throw error;
      }finally{
        clearTimeout(timer);
        if(request===modelRequest){preparing=0;frames.sync();}
      }
    },
  };
}
