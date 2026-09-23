"""Render fallback views from the owner's original GLBs (Blender 4.5 / bpy).
Usage: python render-observatory.py liangzai.glb nailong.glb [mode:view ...]
"""
import bpy, math, sys
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU'
scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=768;scene.render.resolution_y=864;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
actors={}
for id,path,height in [('liangzai',sys.argv[1],4.85),('nailong',sys.argv[2],4.12)]:
    before=set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(Path(path).resolve()))
    imported=set(scene.objects)-before
    vertices=[o.matrix_world@Vector(v) for o in imported if o.type=='MESH' for v in o.bound_box]
    lo=Vector([min(v[i] for v in vertices) for i in range(3)]);hi=Vector([max(v[i] for v in vertices) for i in range(3)])
    content=bpy.data.objects.new(id+'_content',None);scene.collection.objects.link(content)
    for o in imported:
        if o.parent is None:o.parent=content
    content.location=(-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)
    norm=bpy.data.objects.new(id+'_normalization',None);scene.collection.objects.link(norm);content.parent=norm;norm.scale=(height/(hi.z-lo.z),)*3
    pivot=bpy.data.objects.new(id+'_turntable',None);scene.collection.objects.link(pivot);norm.parent=pivot
    actors[id]=(pivot,imported)
def mat(name,color,metal=0,rough=.3,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
    n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
    if emission:n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emission
    return m
graphite=mat('Brushed graphite',(.008,.014,.025),.82,.32)
silver=mat('Soft silver',(.13,.2,.26),.9,.28)
glow=mat('Ice edge',(.28,.56,.78),.1,.35,1.05)
def torus(r,t,material,pos=(0,0,0),vertical=False):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=128,minor_segments=8,location=pos)
    o=bpy.context.object;o.data.materials.append(material)
    if vertical:o.rotation_euler.x=math.pi/2
    for p in o.data.polygons:p.use_smooth=True
    return o
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=2.53,depth=.25,location=(0,0,-.065));bpy.context.object.data.materials.append(graphite)
torus(2.505,.013,silver,(0,0,.065));torus(2.54,.008,glow,(0,0,-.11))
# Star atlas remains a material surface, never a replacement for the character mesh.
w=768;yy,xx=np.mgrid[0:w,0:w];rgb=np.zeros((w,w,4),dtype=np.float32);rgb[:,:,:3]=[.012,.022,.045];rgb[:,:,3]=1
for i in range(28):
    a=i/28*math.pi*3.8;r=35+i*10;x=384+math.cos(a)*r;y=384+math.sin(a)*r*.72
    g=np.maximum(0,1-np.sqrt((xx-x)**2+(yy-y)**2)/105)**2
    rgb[:,:,:3]+=g[:,:,None]*np.array([.012,.025,.055])
seed=72931
def random():
    global seed
    seed=(seed*1664525+1013904223)&0xffffffff
    return seed/4294967296
for i in range(2100):
    a=random()*math.tau;r=math.sqrt(random())*360;x=int(384+math.cos(a)*r);y=int(384+math.sin(a)*r);bright=random()
    c=np.array([.62,.8,.96])*(.18+bright*.65)
    rgb[y,x,:3]=c
    if bright>.985:
        rgb[y-1:y+2,x-1:x+2,:3]=[.78,.87,1]
        rgb[y-4:y+5,x,:3]=[.12,.21,.33];rgb[y,x-4:x+5,:3]=[.12,.21,.33]
image=bpy.data.images.new('Star atlas',width=w,height=w,alpha=True);image.pixels.foreach_set(rgb.ravel());image.pack()
star=mat('Starfield glass',(.8,.8,.8),.32,.3)
n=star.node_tree.nodes;links=star.node_tree.links;tex=n.new('ShaderNodeTexImage');tex.image=image
bsdf=n.get('Principled BSDF');links.new(tex.outputs['Color'],bsdf.inputs['Base Color']);links.new(tex.outputs['Color'],bsdf.inputs['Emission Color']);bsdf.inputs['Emission Strength'].default_value=1.55;bsdf.inputs['Coat Weight'].default_value=.9;bsdf.inputs['Coat Roughness'].default_value=.22
bpy.ops.mesh.primitive_circle_add(vertices=128,radius=2.47,fill_type='NGON',location=(0,0,.069));top=bpy.context.object;top.data.materials.append(star)
uv=top.data.uv_layers.new()
for loop in top.data.loops:
    p=top.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x/4.94+.5,p.y/4.94+.5)
torus(2.35,.004,glow,(0,0,.076));torus(2.1,.003,silver,(0,0,.078))
constellation=[(-1.45,1.25),(-.72,1.73),(-.05,1.47),(.64,1.86),(1.42,1.32)]
star_light=mat('Constellation stars',(.48,.7,1),0,.4,2)
star_line=mat('Constellation hairlines',(.14,.26,.45),0,.4,.6)
for i,(x,z) in enumerate(constellation):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=6,radius=.021,location=(x,-z,.094));bpy.context.object.data.materials.append(star_light)
    if i:
        px,pz=constellation[i-1];a=Vector((px,-pz,.087));b=Vector((x,-z,.087));delta=b-a
        bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.003,depth=delta.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();o.data.materials.append(star_line)
portal=bpy.data.objects.new('Quiet orbital halo',None);scene.collection.objects.link(portal);portal.location=(0,1.35,2.6);portal.rotation_euler=(math.pi/2+.05,-.12,-.16)
for r,t,m,z in [(2.78,.07,graphite,0),(2.78,.014,silver,.07),(2.685,.007,glow,0),(2.97,.005,silver,0)]:
    o=torus(r,t,m);o.parent=portal;o.location.z=z
for i in range(48):
    a=i/48*math.tau;bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.data.materials.append(silver);o.parent=portal;o.dimensions=(.017,.09,.045);o.location=(math.cos(a)*2.78,math.sin(a)*2.78,.058);o.rotation_euler.z=a-math.pi/2
floor=mat('Ground',(.004,.008,.016),.35,.55)
bpy.ops.mesh.primitive_plane_add(size=15,location=(0,0,-.195));bpy.context.object.data.materials.append(floor)
n=floor.node_tree.nodes;l=floor.node_tree.links;t=n.new('ShaderNodeTexCoord');length=n.new('ShaderNodeVectorMath');length.operation='LENGTH';l.new(t.outputs['Object'],length.inputs[0]);fade=n.new('ShaderNodeMapRange');fade.clamp=True;fade.inputs['From Min'].default_value=1.5;fade.inputs['From Max'].default_value=6.8;fade.inputs['To Min'].default_value=1;fade.inputs['To Max'].default_value=0;l.new(length.outputs['Value'],fade.inputs['Value']);l.new(fade.outputs['Result'],n.get('Principled BSDF').inputs['Alpha'])
world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.19,.25,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4;scene.world=world
def area(name,pos,color,power,size,shape='DISK'):
    d=bpy.data.lights.new(name,'AREA');d.color=color;d.energy=power;d.shape=shape;d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,2.3))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm silk key',(-4,-5,7),(1,.94,.86),740,5)
area('Cool broad fill',(4,-3,4),(.68,.8,1),250,4)
area('Silver rim',(2,4,5),(.64,.8,1),850,3)
area('Ceiling reflection',(-1,0,8),(.9,.95,1),350,4)
bpy.ops.object.camera_add(location=(0,-11.8,4.5));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,2.55))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=24;scene.camera=camera
views={'front':0,'side':math.pi/2,'back':math.pi,'reset':-.18}
destination=ROOT/'outputs/observatory-renders';destination.mkdir(parents=True,exist_ok=True)
requested=sys.argv[3:] or [f'{m}:{v}' for m in ['liangzai','nailong','duo'] for v in views]
for request in requested:
    mode,view=request.split(':')
    for id,(pivot,objects) in actors.items():
        shown=mode=='duo' or mode==id
        for o in objects:o.hide_render=not shown
        pivot.location=(-1.24 if id=='liangzai' else 1.22, -.12 if id=='nailong' else 0,.092) if mode=='duo' else (0,0,.092)
        pivot.scale=(.87 if mode=='duo' else 1,)*3;pivot.rotation_euler.z=views[view]+((.055 if id=='liangzai' else -.055) if mode=='duo' else 0)
    camera.data.lens=24/(2*math.tan(math.radians(35/2)))*(.94 if mode=='duo' else 1)
    scene.render.filepath=str(destination/f'{mode}-{view}.png');bpy.ops.render.render(write_still=True)
