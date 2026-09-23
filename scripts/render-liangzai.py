"""Optional CPU reference render: Blender 4.5 Python module (bpy).

Imports the delivered GLB, recreates the homepage light ring, and renders the
same model for WebGL-unavailable devices. Run after npm run model:export.
"""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public/assets/models/liangzai-v1.glb'))
for obj in scene.objects:
    obj.animation_data_clear()
robot = bpy.data.objects['Liangzai']
robot.rotation_mode = 'XYZ'
robot.location.z = .16
robot.rotation_euler.z = -.24

def material(name, color, metal=0, rough=.3, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Metallic'].default_value = metal
    node.inputs['Roughness'].default_value = rough
    if emission:
        node.inputs['Emission Color'].default_value = (*color, 1)
        node.inputs['Emission Strength'].default_value = emission
    return mat

metal = material('Portal titanium', (.06,.095,.14), .92, .29)
dark = material('Graphite titanium', (.008,.02,.038), .85,.43)
edge = material('Brushed silver', (.36,.46,.56), .96,.2)
light = material('Ice blue emission', (.16,.62,1), .1,.3,2.7)
portal = bpy.data.objects.new('Portal', None)
scene.collection.objects.link(portal)
portal.location = (.1,1.16,2.8)
# The local torus plane is XY; orient it in the character's vertical plane.
portal.rotation_euler = (math.pi/2+.04, -.09, -.2)
def ring(radius, tube, depth, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=tube, major_segments=112, minor_segments=12)
    obj = bpy.context.object
    obj.data.materials.append(mat)
    obj.parent = portal
    obj.location.z = depth
    for face in obj.data.polygons: face.use_smooth=True
    return obj

ring(2.7,.23,0,metal)
ring(2.7,.045,.235,edge)
ring(2.94,.025,0,edge)
ring(2.46,.075,.02,dark)
ring(2.455,.018,.095,light)
ring(2.49,.008,.18,light)
ring(2.67,.08,-.26,dark)
outer=ring(3.12,.008,.05,edge)
outer.rotation_euler = (.32,-.2,0)
for count, dims, mat, depth in [(40,(.014,.41,.35),dark,.025),(16,(.08,.045,.023),light,.248)]:
    for index in range(count):
        a=index/count*math.tau
        bpy.ops.mesh.primitive_cube_add(size=1)
        obj=bpy.context.object
        obj.dimensions=dims
        obj.data.materials.append(mat)
        obj.parent=portal
        obj.location=(math.cos(a)*2.7,math.sin(a)*2.7,depth)
        obj.rotation_euler.z=a-(math.pi/2 if count==40 else 0)

bpy.ops.mesh.primitive_plane_add(size=80, location=(0,0,-.018))
floor_mat=material('Floor',(.004,.008,.016),.68,.35)
bpy.context.object.data.materials.append(floor_mat)
# Fade the ground away before the horizon, matching the live scene.
nodes=floor_mat.node_tree.nodes;links=floor_mat.node_tree.links
tex=nodes.new('ShaderNodeTexCoord')
length=nodes.new('ShaderNodeVectorMath');length.operation='LENGTH'
links.new(tex.outputs['Object'],length.inputs[0])
fade=nodes.new('ShaderNodeMapRange');fade.clamp=True
fade.inputs['From Min'].default_value=2.0;fade.inputs['From Max'].default_value=5.0
fade.inputs['To Min'].default_value=1.0;fade.inputs['To Max'].default_value=0.0
links.new(length.outputs['Value'],fade.inputs['Value'])
links.new(fade.outputs['Result'],nodes.get('Principled BSDF').inputs['Alpha'])
bpy.ops.mesh.primitive_cylinder_add(vertices=80, radius=1.065, depth=.12, location=(0,0,-.065))
bpy.context.object.data.materials.append(dark)
bpy.ops.mesh.primitive_torus_add(major_radius=1.065, minor_radius=.009, major_segments=80, minor_segments=8,location=(0,0,-.011))
bpy.context.object.data.materials.append(light)
world = bpy.data.worlds.new('Studio ambience')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value=(.17,.24,.35,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.world = world
def area(name,position,color,power,size):
    data=bpy.data.lights.new(name,'AREA')
    data.color=color;data.energy=power;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj)
    obj.location=position
    obj.rotation_euler=(Vector((0,0,2.7))-obj.location).to_track_quat('-Z','Y').to_euler()
area('White softbox',(-3,-5,6),(.88,.94,1),850,5)
area('Blue fill',(5,-2,3),(.2,.4,1),550,4)
area('Portal rim',(-1,4,4),(.2,.7,1),1100,3)
area('Ceiling reflection',(0,0,8),(1,1,1),600,4)
bpy.ops.object.camera_add(location=(0,-10.9,2.9))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,2.75))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='PERSP'
camera.data.lens_unit='FOV'
camera.data.angle=math.radians(36)
scene.camera=camera
destination=ROOT/'outputs/model-renders'
destination.mkdir(parents=True,exist_ok=True)
views={'reset':-.24,'front':0,'side':math.pi/2,'back':math.pi}
requested=sys.argv[1:] or ['reset']
for view in requested:
    robot.rotation_euler.z=views[view]
    scene.render.filepath=str(destination/f'{view}.png')
    bpy.ops.render.render(write_still=True)
