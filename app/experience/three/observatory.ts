import * as THREE from "three";

/** Large reflection panels produce broad highlights instead of harsh hotspots. */
export function createStudioEnvironment() {
  const environment=new THREE.Scene();environment.background=new THREE.Color(0x333b48);
  const panel=(color:number,intensity:number,width:number,height:number,position:number[])=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));
    mesh.position.set(position[0],position[1],position[2]);mesh.lookAt(0,2,0);environment.add(mesh);
  };
  panel(0xfff3df,3,5,6,[-4,7,5]);panel(0xbcd6ff,1.5,3,6,[5,4,2]);panel(0xabcfff,2.5,2,5,[1,5,-5]);
  return environment;
}
