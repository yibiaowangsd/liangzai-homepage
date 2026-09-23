import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { gsap } from "gsap";
import { loadCharacter, disposeObject, VIEW_ANGLES, type CharacterId, type ModelMode, type ModelView } from "./character-assets";
import { createObservatory, createStudioEnvironment } from "./observatory";
import { createFrameScheduler, createShadowBudget } from "./render-scheduler";

export type HeroScene = {
  setMotion(enabled: boolean): void;
  setView(view: ModelView): void;
  setModel(mode: ModelMode): Promise<void>;
  resonate(): void;
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
  const pose={yaw:VIEW_ANGLES.reset,pitch:0,gaze:0,lift:0,energy:0};
  const ctx=gsap.context(()=>{});
  let pulseTimeline:gsap.core.Timeline | null=null;
  const shadows=createShadowBudget();
  const frames=createFrameScheduler({
    requestFrame:callback=>requestAnimationFrame(callback),
    cancelFrame:handle=>cancelAnimationFrame(handle),
    canRender:()=>ready&&!preparing&&visible&&!document.hidden&&!disposed&&!lostContext,
    continuous:()=>enabled,
    fps:()=>width<600?30:45,
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
      actor.rotation.y=pose.yaw+(mode==="duo"?(id==="liangzai"?.055:-.055):0);
      actor.rotation.x=pose.pitch;actor.rotation.z=pose.gaze;
    }
    invalidate(true);
  };
  const yawTo=gsap.quickTo(pose,"yaw",{duration:.65,ease:"power3.out",onUpdate:applyPose});
  const pitchTo=gsap.quickTo(pose,"pitch",{duration:.65,ease:"power3.out",onUpdate:applyPose});
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
  function setView(view:ModelView){
    activeView=view;
    if(enabled){yawTo(VIEW_ANGLES[view]);pitchTo(0);gazeTo(0);}
    else{pose.yaw=VIEW_ANGLES[view];pose.pitch=pose.gaze=0;applyPose();}
  }
  function resonate(){
    if(disposed||lostContext)return;
    pulseTimeline?.kill();pose.lift=pose.energy=0;
    if(!enabled){invalidate();return;}
    ctx.add(()=>{
      pulseTimeline=gsap.timeline({onUpdate:()=>invalidate(true)})
        .to(pose,{lift:.11,energy:1,duration:.55,ease:"sine.out"})
        .to(pose,{lift:0,energy:0,duration:1.2,ease:"sine.inOut"});
    });
  }
  let dragging=false,distance=0,lastX=0,lastY=0,targetYaw=pose.yaw,targetPitch=0;
  const down=(e:PointerEvent)=>{if(e.button!==0)return;dragging=true;distance=0;lastX=e.clientX;lastY=e.clientY;targetYaw=pose.yaw;targetPitch=pose.pitch;canvas.setPointerCapture(e.pointerId);canvas.classList.add("is-dragging");};
  const move=(e:PointerEvent)=>{
    if(dragging){const dx=e.clientX-lastX,dy=e.clientY-lastY;distance+=Math.abs(dx)+Math.abs(dy);lastX=e.clientX;lastY=e.clientY;targetYaw+=dx*.008;targetPitch=THREE.MathUtils.clamp(targetPitch+dy*.002,-.1,.13);
      if(enabled){yawTo(targetYaw);pitchTo(targetPitch);}else{pose.yaw=targetYaw;pose.pitch=targetPitch;applyPose();}
    }else if(enabled&&e.pointerType==="mouse"){const r=canvas.getBoundingClientRect();gazeTo(((e.clientX-r.left)/r.width-.5)*-.035);}
  };
  const raycaster=new THREE.Raycaster();
  const up=(e:PointerEvent)=>{
    if(!dragging)return;dragging=false;canvas.classList.remove("is-dragging");if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(distance<8){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
      if([...actors.values()].some(actor=>actor.visible&&raycaster.intersectObject(actor,true).length))resonate();}
  };
  const cancel=()=>{dragging=false;canvas.classList.remove("is-dragging");};
  const leave=()=>{if(enabled)gazeTo(0);};
  const keyboard=(e:KeyboardEvent)=>{
    if(!["ArrowLeft","ArrowRight","Home","Enter"," "].includes(e.key))return;e.preventDefault();
    if(e.key==="Enter"||e.key===" ")resonate();else if(e.key==="Home")setView("reset");
    else{const angle=pose.yaw+(e.key==="ArrowLeft"?-.3:.3);if(enabled)yawTo(angle);else{pose.yaw=angle;applyPose();}}
  };
  const lost=(e:Event)=>{e.preventDefault();lostContext=true;sync();onFallback();};
  const listeners={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,pointerleave:leave,keydown:keyboard,webglcontextlost:lost};
  for(const [type,listener] of Object.entries(listeners))canvas.addEventListener(type,listener as EventListener);
  document.addEventListener("visibilitychange",sync);
  function dispose(){
    if(disposed)return;disposed=true;modelRequest++;frames.dispose();ctx.revert();[yawTo,pitchTo,gazeTo].forEach(t=>t.tween.kill());
    observer.disconnect();visibility.disconnect();cancelAnimationFrame(resizeFrame);document.removeEventListener("visibilitychange",sync);signal.removeEventListener("abort",dispose);
    for(const [type,listener] of Object.entries(listeners))canvas.removeEventListener(type,listener as EventListener);
    disposeObject(scene);actors.clear();pending.clear();compiledActors.clear();environment.dispose();key.shadow.dispose();bloom.dispose();output.dispose();renderPass.dispose();composer.dispose();renderer.dispose();renderer.forceContextLoss();
  }
  signal.addEventListener("abort",dispose,{once:true});
  resize();
  return {
    setMotion(value){enabled=value;if(!value){pulseTimeline?.progress(1).kill();[yawTo,pitchTo,gazeTo].forEach(t=>t.tween.pause());pose.pitch=pose.gaze=pose.lift=pose.energy=0;applyPose();}sync();},
    setView,resonate,dispose,
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
