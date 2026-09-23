import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** Reference model: front + side + rear drawings supplied by the character owner.
 * +Z is forward; Y is up. Named transform groups form a reusable articulated rig.
 * All details are geometry and PBR materials, so GLB export has no texture dependencies.
 */
export function createLiangzai() {
  const root = new THREE.Group();
  root.name = "Liangzai";
  root.userData = {
    character: "量仔",
    version: "1.0",
    reference: "Owner supplied three-view character sheet",
    front: "+Z",
    units: "meters",
  };
  const materials = {
    ceramic: new THREE.MeshPhysicalMaterial({
      color: 0xe5edf4,
      metalness: 0.15,
      roughness: 0.28,
      clearcoat: 0.85,
      clearcoatRoughness: 0.22,
    }),
    blue: new THREE.MeshPhysicalMaterial({
      color: 0x0753ef,
      metalness: 0.45,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
    }),
    yellow: new THREE.MeshStandardMaterial({
      color: 0xffc72c,
      metalness: 0.35,
      roughness: 0.28,
    }),
    visor: new THREE.MeshPhysicalMaterial({
      color: 0x020b22,
      metalness: 0.08,
      roughness: 0.38,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
    }),
    graphite: new THREE.MeshStandardMaterial({
      color: 0x111d2d,
      metalness: 0.6,
      roughness: 0.35,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: 0x687d98,
      metalness: 0.85,
      roughness: 0.32,
    }),
    cyan: new THREE.MeshStandardMaterial({
      color: 0x35dfff,
      emissive: 0x05c9ee,
      emissiveIntensity: 1.4,
      metalness: 0.05,
      roughness: 0.3,
    }),
    whiteLight: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x8be9ff,
      emissiveIntensity: 1,
      roughness: 0.3,
    }),
    smile: new THREE.MeshStandardMaterial({
      color: 0xff966e,
      emissive: 0xe56840,
      emissiveIntensity: 0.5,
      roughness: 0.35,
    }),
  };
  Object.entries(materials).forEach(([name, m]) => {
    m.name = `Liangzai_${name}`;
  });
  const geometries = new Set<THREE.BufferGeometry>();
  const sphere = new THREE.SphereGeometry(1, 32, 20);
  const box = new RoundedBoxGeometry(1, 1, 1, 3, 0.12);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 40);
  geometries.add(sphere);
  geometries.add(box);
  geometries.add(cylinder);
  const own = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.add(g);
    return g;
  };
  function mesh(
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    pos: number[] = [0, 0, 0],
    scale: number[] = [1, 1, 1],
  ) {
    const m = new THREE.Mesh(geometry, material);
    m.name = name;
    m.position.set(pos[0], pos[1], pos[2]);
    m.scale.set(scale[0], scale[1], scale[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function ellipsoid(
    name: string,
    parent: THREE.Object3D,
    pos: number[],
    scale: number[],
    material: THREE.Material = materials.ceramic,
  ) {
    return mesh(name, sphere, material, parent, pos, scale);
  }
  function torus(
    name: string,
    parent: THREE.Object3D,
    r: number,
    t: number,
    pos: number[],
    material: THREE.Material,
    arc = Math.PI * 2,
  ) {
    return mesh(
      name,
      own(new THREE.TorusGeometry(r, t, 8, 64, arc)),
      material,
      parent,
      pos,
    );
  }
  function tube(
    name: string,
    parent: THREE.Object3D,
    points: THREE.Vector3[],
    r: number,
    material: THREE.Material,
  ) {
    return mesh(
      name,
      own(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          Math.max(20, points.length * 2),
          r,
          8,
          false,
        ),
      ),
      material,
      parent,
    );
  }
  function superShape(exp: number, segments = 40, rings = 26) {
    const g = own(new THREE.SphereGeometry(1, segments, rings));
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++)
      p.setXYZ(
        i,
        Math.sign(p.getX(i)) * Math.pow(Math.abs(p.getX(i)), exp),
        Math.sign(p.getY(i)) * Math.pow(Math.abs(p.getY(i)), exp),
        Math.sign(p.getZ(i)) * Math.pow(Math.abs(p.getZ(i)), exp),
      );
    const normals = g.getAttribute("normal");
    const normal = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      normal.set(
        Math.sign(p.getX(i)) * Math.pow(Math.abs(p.getX(i)), 2 / exp - 1),
        Math.sign(p.getY(i)) * Math.pow(Math.abs(p.getY(i)), 2 / exp - 1),
        Math.sign(p.getZ(i)) * Math.pow(Math.abs(p.getZ(i)), 2 / exp - 1),
      ).normalize();
      normals.setXYZ(i, normal.x, normal.y, normal.z);
    }
    return g;
  }
  function plate(
    name: string,
    shape: THREE.Shape,
    parent: THREE.Object3D,
    material: THREE.Material,
    pos: number[],
    depth = 0.08,
    bevel = 0.025,
  ) {
    return mesh(
      name,
      own(
        new THREE.ExtrudeGeometry(shape, {
          depth,
          steps: 1,
          bevelEnabled: true,
          bevelSegments: 3,
          bevelSize: bevel,
          bevelThickness: bevel,
          curveSegments: 12,
        }),
      ),
      material,
      parent,
      pos,
    );
  }

  const body = new THREE.Group();
  body.name = "Body";
  root.add(body);
  mesh(
    "Torso_ceramic_shell",
    superShape(0.87, 32, 20),
    materials.ceramic,
    body,
    [0, 1.86, 0],
    [0.66, 0.67, 0.4],
  );
  ellipsoid(
    "Back_camera_bezel",
    body,
    [0, 2.19, -0.38],
    [0.059, 0.079, 0.016],
    materials.graphite,
  );
  ellipsoid(
    "Back_camera_sensor",
    body,
    [0, 2.205, -0.398],
    [0.024, 0.024, 0.009],
    materials.cyan,
  );
  ellipsoid(
    "Back_status_dot",
    body,
    [0, 2.14, -0.392],
    [0.012, 0.012, 0.008],
    materials.blue,
  );
  const waist = torus(
    "Blue_waist_belt",
    body,
    0.55,
    0.065,
    [0, 1.31, 0],
    materials.blue,
  );
  waist.rotation.x = Math.PI / 2;
  waist.scale.set(1.13, 0.72, 1);
  const beltEdge = torus(
    "Waist_silver_inlay",
    body,
    0.55,
    0.015,
    [0, 1.27, 0],
    materials.trim,
  );
  beltEdge.rotation.x = Math.PI / 2;
  beltEdge.scale.set(1.13, 0.72, 1);
  mesh(
    "Neck_graphite_joint",
    cylinder,
    materials.graphite,
    body,
    [0, 2.56, 0],
    [0.26, 0.19, 0.26],
  );
  mesh(
    "Golden_neck_collar",
    cylinder,
    materials.yellow,
    body,
    [0, 2.58, 0],
    [0.28, 0.09, 0.28],
  );

  const chest = mesh(
    "Chest_badge_housing",
    cylinder,
    materials.blue,
    body,
    [0, 1.97, 0.423],
    [0.284, 0.083, 0.284],
  );
  chest.rotation.x = Math.PI / 2;
  const badge = mesh(
    "Chest_badge_glass",
    cylinder,
    materials.visor,
    body,
    [0, 1.97, 0.477],
    [0.238, 0.018, 0.238],
  );
  badge.rotation.x = Math.PI / 2;
  torus("Chest_badge_rim", body, 0.274, 0.012, [0, 1.97, 0.48], materials.trim);
  const q1 = torus(
    "Chest_Q_cyan",
    body,
    0.123,
    0.024,
    [0.044, 1.98, 0.501],
    materials.cyan,
    Math.PI * 1.62,
  );
  q1.rotation.z = 0.25;
  const q2 = torus(
    "Chest_Q_white",
    body,
    0.123,
    0.024,
    [0.044, 1.98, 0.506],
    materials.whiteLight,
    Math.PI * 0.78,
  );
  q2.rotation.z = Math.PI * 0.75;
  const qtail = mesh(
    "Chest_Q_tail",
    box,
    materials.whiteLight,
    body,
    [0.151, 1.875, 0.513],
    [0.074, 0.042, 0.021],
  );
  qtail.rotation.z = -0.68;
  [
    [-0.15, 2.025],
    [-0.127, 2.091],
    [-0.065, 2.106],
    [-0.174, 1.96],
    [-0.112, 1.932],
  ].forEach(([x, y], i) =>
    ellipsoid(
      `Chest_orbit_dot_${i}`,
      body,
      [x, y, 0.503],
      [0.018, 0.018, 0.008],
      materials.blue,
    ),
  );
  const orbit = torus(
    "Chest_orbit",
    body,
    0.077,
    0.013,
    [-0.097, 1.969, 0.507],
    materials.blue,
    Math.PI * 0.9,
  );
  orbit.rotation.z = Math.PI;

  const head = new THREE.Group();
  head.name = "Head";
  head.position.y = 3.57;
  root.add(head);
  mesh(
    "Head_main_shell",
    superShape(0.72, 48, 32),
    materials.ceramic,
    head,
    [0, 0, 0],
    [1.22, 0.97, 0.77],
  );
  const shellFront = (x: number, y: number) =>
    0.77 * Math.pow(Math.max(0.004, 1 - Math.pow(Math.abs(x / 1.22), 2 / 0.72) - Math.pow(Math.abs(y / 0.97), 2 / 0.72)), 0.72 / 2);
  const visorShape = new THREE.Shape();
  visorShape.moveTo(-0.98, -0.53);
  visorShape.bezierCurveTo(-1.1, -0.28, -1.11, 0.39, -0.8, 0.55);
  visorShape.bezierCurveTo(-0.49, 0.8, -0.3, 0.53, -0.16, 0.38);
  visorShape.bezierCurveTo(-0.07, 0.28, 0.07, 0.28, 0.16, 0.38);
  visorShape.bezierCurveTo(0.3, 0.53, 0.49, 0.8, 0.8, 0.55);
  visorShape.bezierCurveTo(1.11, 0.39, 1.1, -0.28, 0.98, -0.53);
  visorShape.bezierCurveTo(0.75, -0.81, -0.75, -0.81, -0.98, -0.53);
  const seal = plate(
    "Visor_graphite_gasket",
    visorShape,
    head,
    materials.graphite,
    [0, -0.02, 0.716],
    0.06,
    0.023,
  );
  seal.scale.set(1.035, 1.035, 1);
  const visor = plate(
    "Visor_dark_glass",
    visorShape,
    head,
    materials.visor,
    [0, -0.02, 0.765],
    0.066,
    0.027,
  );
  // Wrap the visor around the shell, including its side profile.
  for (const part of [seal, visor]) {
    // Extruded caps have large triangles. Subdivide before curving, otherwise
    // their interiors cut through the head even if every edge vertex fits.
    const source = part.geometry.getAttribute("position");
    const positions: number[] = [];
    const subdivide = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
      const lengths = [a.distanceToSquared(b), b.distanceToSquared(c), c.distanceToSquared(a)];
      const longest = Math.max(...lengths);
      if (longest < 0.0256) { positions.push(...a.toArray(), ...b.toArray(), ...c.toArray()); return; }
      if (longest === lengths[0]) {
        const m = a.clone().add(b).multiplyScalar(0.5);
        subdivide(a, m, c); subdivide(m, b, c);
      } else if (longest === lengths[1]) {
        const m = b.clone().add(c).multiplyScalar(0.5);
        subdivide(a, b, m); subdivide(a, m, c);
      } else {
        const m = c.clone().add(a).multiplyScalar(0.5);
        subdivide(a, b, m); subdivide(m, b, c);
      }
    };
    for (let i = 0; i < source.count; i += 3)
      subdivide(new THREE.Vector3().fromBufferAttribute(source, i), new THREE.Vector3().fromBufferAttribute(source, i+1), new THREE.Vector3().fromBufferAttribute(source, i+2));
    const dense = new THREE.BufferGeometry();
    dense.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    part.geometry = own(mergeVertices(dense));
    dense.dispose();
    const vertices = part.geometry.getAttribute("position");
    for (let i = 0; i < vertices.count; i++) {
      const surface = shellFront(vertices.getX(i) * part.scale.x, vertices.getY(i) * part.scale.y - 0.02);
      vertices.setZ(i, vertices.getZ(i) + surface - 0.77);
    }
    part.geometry.computeVertexNormals();
    part.geometry.normalizeNormals();
  }
  // Fine, separate crown panel seam and rear cover follow the three-view drawing.
  tube(
    "Crown_panel_seam",
    head,
    [
      new THREE.Vector3(-0.51, 0.89, shellFront(-0.51, 0.89) + 0.005),
      new THREE.Vector3(-0.3, 0.64, shellFront(-0.3, 0.64) + 0.005),
      new THREE.Vector3(-0.22, 0.59, shellFront(-0.22, 0.59) + 0.005),
      new THREE.Vector3(0, 0.58, shellFront(0, 0.58) + 0.005),
      new THREE.Vector3(0.22, 0.59, shellFront(0.22, 0.59) + 0.005),
      new THREE.Vector3(0.3, 0.64, shellFront(0.3, 0.64) + 0.005),
      new THREE.Vector3(0.51, 0.89, shellFront(0.51, 0.89) + 0.005),
    ],
    0.005,
    materials.trim,
  );
  const rearPanel = mesh(
    "Rear_head_service_panel",
    box,
    materials.ceramic,
    head,
    [0, 0.23, -0.765],
    [0.72, 1.1, 0.035],
  );
  rearPanel.geometry = own(box.clone());
  const rearVertices = rearPanel.geometry.getAttribute("position");
  for (let i = 0; i < rearVertices.count; i++) {
    const x = rearVertices.getX(i) * rearPanel.scale.x;
    const y = rearVertices.getY(i) * rearPanel.scale.y + rearPanel.position.y;
    rearVertices.setZ(i, rearVertices.getZ(i) + (-shellFront(x, y) - 0.007 - rearPanel.position.z) / rearPanel.scale.z);
  }
  rearPanel.geometry.computeVertexNormals();
  for (const side of [-1, 1]) {
    const earShape = new THREE.Shape();
    earShape.moveTo(0.59, 0.73);
    earShape.bezierCurveTo(0.76, 1.0, 1.02, 1.32, 1.11, 1.25);
    earShape.bezierCurveTo(1.25, 1.16, 1.32, 0.77, 1.13, 0.48);
    earShape.closePath();
    const ear = plate(
      `Ear_${side < 0 ? "L" : "R"}_ceramic`,
      earShape,
      head,
      materials.ceramic,
      [0, 0, -0.16],
      0.3,
      0.07,
    );
    ear.scale.x = side;
    const inner = new THREE.Shape();
    inner.moveTo(0.74, 0.79);
    inner.bezierCurveTo(0.86, 1.01, 1.03, 1.17, 1.075, 1.12);
    inner.bezierCurveTo(1.16, 1.03, 1.18, 0.82, 1.08, 0.69);
    inner.closePath();
    const gold = plate(
      `Ear_${side < 0 ? "L" : "R"}_gold_inset`,
      inner,
      head,
      materials.yellow,
      [0, 0, 0.22],
      0.03,
      0.028,
    );
    gold.scale.x = side;
    const headphone = mesh(
      `Headphone_${side}`,
      cylinder,
      materials.blue,
      head,
      [side * 1.27, -0.12, -0.025],
      [0.325, 0.26, 0.325],
    );
    headphone.rotation.z = Math.PI / 2;
    const trim = mesh(
      `Headphone_${side}_rim`,
      cylinder,
      materials.trim,
      head,
      [side * 1.415, -0.12, -0.025],
      [0.226, 0.025, 0.226],
    );
    trim.rotation.z = Math.PI / 2;
    const cap = mesh(
      `Headphone_${side}_gold`,
      cylinder,
      materials.yellow,
      head,
      [side * 1.437, -0.12, -0.025],
      [0.163, 0.035, 0.163],
    );
    cap.rotation.z = Math.PI / 2;
    const aerial = mesh(
      `Radio_fin_${side}`,
      box,
      materials.blue,
      head,
      [side * 1.355, 0.62, -0.105],
      [0.064, 1.18, 0.115],
    );
    aerial.rotation.z = -side * 0.032;
    mesh(
      `Radio_fin_${side}_inlay`,
      box,
      materials.trim,
      head,
      [side * 1.355, 0.61, -0.044],
      [0.011, 0.86, 0.006],
    );
  }
  const antenna = new THREE.Group();
  antenna.name = "Antenna";
  antenna.position.set(0, 0.985, -0.03);
  head.add(antenna);
  ellipsoid(
    "Antenna_socket",
    antenna,
    [0, 0, 0],
    [0.115, 0.055, 0.115],
    materials.graphite,
  );
  const coil = Array.from({ length: 47 }, (_, i) => {
    const t = i / 46;
    return new THREE.Vector3(
      Math.sin(t * Math.PI * 4.7) * 0.063,
      t * 0.49,
      Math.cos(t * Math.PI * 4.7) * 0.035,
    );
  });
  tube("Antenna_spring", antenna, coil, 0.019, materials.graphite);
  ellipsoid(
    "Antenna_primary_orb",
    antenna,
    [0, 0.66, 0],
    [0.183, 0.183, 0.183],
    materials.blue,
  );
  ellipsoid(
    "Antenna_satellite_orb",
    antenna,
    [0.255, 0.735, 0.012],
    [0.067, 0.067, 0.067],
    materials.blue,
  );
  const eyes = new THREE.Group();
  eyes.name = "Eyes";
  eyes.position.set(0, -0.035, 0.882);
  head.add(eyes);
  const cellPositions: number[] = [];
  for (const side of [-1, 1]) {
    for (let row = -6; row <= 6; row++)
      for (let col = -4; col <= 4; col++) {
        const u = col / 4.8,
          v = row / 6.8;
        if (u * u + v * v > 1) continue;
        const x = side * 0.478 + col * 0.033,
          y = row * 0.034 + 0.027,
          w = 0.0125,
          h = 0.0135;
        cellPositions.push(
          x - w,
          y - h,
          0,
          x + w,
          y - h,
          0,
          x + w,
          y + h,
          0,
          x - w,
          y - h,
          0,
          x + w,
          y + h,
          0,
          x - w,
          y + h,
          0,
        );
      }
  }
  const cells = own(new THREE.BufferGeometry());
  cells.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(cellPositions, 3),
  );
  const eyeVertices = cells.getAttribute("position");
  for (let i = 0; i < eyeVertices.count; i++)
    eyeVertices.setZ(i, shellFront(eyeVertices.getX(i), eyeVertices.getY(i) - 0.035) - 0.77);
  cells.computeVertexNormals();
  mesh("Cyan_LED_eye_matrix", cells, materials.cyan, eyes);
  const smile = tube(
    "Warm_smile",
    head,
    [
      new THREE.Vector3(-0.13, -0.315, shellFront(-0.13, -0.315) + 0.117),
      new THREE.Vector3(-0.07, -0.345, shellFront(-0.07, -0.345) + 0.117),
      new THREE.Vector3(0, -0.355, shellFront(0, -0.355) + 0.117),
      new THREE.Vector3(0.07, -0.345, shellFront(0.07, -0.345) + 0.117),
      new THREE.Vector3(0.13, -0.315, shellFront(0.13, -0.315) + 0.117),
    ],
    0.011,
    materials.smile,
  );
  smile.castShadow = false;

  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const label = side < 0 ? "Left" : "Right";
    const arm = new THREE.Group();
    arm.name = `${label}Arm`;
    arm.position.set(side * 0.62, 2.31, 0);
    arm.rotation.z = side * 0.13;
    body.add(arm);
    arms.push(arm);
    ellipsoid(
      `${label}_shoulder_joint`,
      arm,
      [side * 0.033, -0.025, 0],
      [0.22, 0.24, 0.24],
      materials.graphite,
    );
    ellipsoid(
      `${label}_upper_arm`,
      arm,
      [side * 0.067, -0.3, 0.015],
      [0.242, 0.385, 0.242],
    );
    mesh(
      `${label}_elbow_band`,
      cylinder,
      materials.blue,
      arm,
      [side * 0.105, -0.62, 0.025],
      [0.235, 0.12, 0.235],
    );
    ellipsoid(
      `${label}_palm`,
      arm,
      [side * 0.108, -0.855, 0.026],
      [0.21, 0.235, 0.19],
    );
    for (let i = 0; i < 3; i++) {
      const finger = ellipsoid(
        `${label}_finger_${i + 1}`,
        arm,
        [side * 0.11 + (i - 1) * 0.086, -1.01, 0.1],
        [0.055, 0.13, 0.07],
      );
      finger.rotation.z = (i - 1) * 0.065;
    }
    const thumb = ellipsoid(
      `${label}_thumb`,
      arm,
      [-side * 0.045, -0.856, 0.156],
      [0.077, 0.133, 0.08],
    );
    thumb.rotation.z = side * 0.35;
    const leg = new THREE.Group();
    leg.name = `${label}Leg`;
    leg.position.set(side * 0.325, 1.17, 0);
    body.add(leg);
    ellipsoid(
      `${label}_hip_joint`,
      leg,
      [0, -0.03, 0],
      [0.24, 0.23, 0.245],
      materials.graphite,
    );
    mesh(
      `${label}_shin`,
      box,
      materials.ceramic,
      leg,
      [0, -0.315, 0],
      [0.43, 0.67, 0.445],
    );
    mesh(
      `${label}_ankle_band`,
      cylinder,
      materials.blue,
      leg,
      [0, -0.585, 0.01],
      [0.256, 0.07, 0.255],
    );
    mesh(
      `${label}_gold_ankle_clasp`,
      box,
      materials.yellow,
      leg,
      [0, -0.565, 0.267],
      [0.15, 0.19, 0.045],
    );
    mesh(
      `${label}_boot_sole`,
      box,
      materials.graphite,
      leg,
      [0, -1.055, 0.115],
      [0.51, 0.12, 0.76],
    );
    const boot = ellipsoid(
      `${label}_boot`,
      leg,
      [0, -0.886, 0.131],
      [0.268, 0.23, 0.389],
    );
    boot.scale.y = 0.23;
    mesh(
      `${label}_boot_inset`,
      box,
      materials.blue,
      leg,
      [0, -0.758, 0.005],
      [0.4, 0.055, 0.34],
    );
  }
  root.updateMatrixWorld(true);
  const animationClips = [
    new THREE.AnimationClip("Idle", 4, [
      new THREE.VectorKeyframeTrack(
        "Liangzai.position",
        [0, 1, 2, 3, 4],
        [0, 0, 0, 0, 0.035, 0, 0, 0, 0, 0, -0.025, 0, 0, 0, 0],
      ),
    ]),
    new THREE.AnimationClip("Hello", 2.4, [
      new THREE.QuaternionKeyframeTrack(
        "LeftArm.quaternion",
        [0, 0.5, 0.85, 1.2, 1.55, 1.9, 2.4],
        [
          ...new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(0, 0, -0.13))
            .toArray(),
          ...new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(0, 0, -2.35))
            .toArray(),
          ...new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(0, 0, -1.9))
            .toArray(),
          ...new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(0, 0, -2.4))
            .toArray(),
          ...new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(0, 0, -1.9))
            .toArray(),
          ...new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(0, 0, -2.25))
            .toArray(),
          ...new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(0, 0, -0.13))
            .toArray(),
        ],
      ),
    ]),
  ];
  return {
    root,
    head,
    eyes,
    antenna,
    arms,
    materials,
    animationClips,
    dispose() {
      geometries.forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
  };
}
