import numpy as np, trimesh as tm, math, json, struct, pathlib, zipfile
from PIL import Image, ImageDraw, ImageFont
from collections import defaultdict
P=pathlib.Path(__file__).parent
rng=np.random.default_rng(12)
M={'Wood':(0,.8,None),'DarkWood':(0,.85,None),'Stone':(0,.86,None),'Recess':(0,.86,None),'Iron':(.25,.55,None),'LightIron':(.25,.48,None),'Bronze':(.2,.55,None),'Cord':(0,.85,None),'Silver':(.2,.5,None),'Ember':(0,.5,'FF8A3D'),'Glass':(0,.45,'FFE9A8'),'Slate':(0,.8,None),'Moss':(0,.85,None),'Bore':(0,.85,None)}
def rgb(h): return np.array([int(h[i:i+2],16)/255 for i in (0,2,4)])
def linear(c):return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)
def norm(a):return a/np.linalg.norm(a)
class Asset:
 def __init__(self,name):self.name=name;self.parts=defaultdict(list);self.piv={};self.parents={};self.vertical=False
 def part(self,n,p=(0,0,0)):self.piv[n]=np.array(p,float);return n
 def add(self,n,m,hex,mat='Wood',vary=.06,colors=None):
  m.fix_normals();v=m.vertices; c=rgb(hex) if isinstance(hex,str) else np.array(hex); 
  if colors is None:
   y=v[:,1];f=(y-y.min())/(np.ptp(y)+1e-9); w=.90+.16*f+vary*(np.sin(v[:,0]*88+v[:,2]*23)*.5+np.sin(v[:,2]*73+v[:,1]*35)*.5);colors=np.clip(c[None,:]*w[:,None],0,1)
  self.parts[n].append((m,mat,np.array(colors)))
 def box(self,n,c,d,h,mat='Wood',ang=0):
  m=tm.creation.box(d);m.apply_transform(tm.transformations.rotation_matrix(ang,[0,1,0]));m.apply_translation(c);self.add(n,m,h,mat)
 def ell(self,n,c,d,h,mat='Wood',sub=1):
  m=tm.creation.icosphere(subdivisions=sub);m.apply_scale(d);m.apply_translation(c);self.add(n,m,h,mat)
 def rod(self,n,a,b,r,h,mat='Wood',r2=None,k=8):
  a,b=np.array(a),np.array(b);axis=norm(b-a);u=norm(np.cross(axis,[1,0,0] if abs(axis[0])<.8 else [0,1,0]));w=np.cross(axis,u);t=np.arange(k)*2*np.pi/k;ring=np.cos(t)[:,None]*u+np.sin(t)[:,None]*w;vs=np.vstack([a+r*ring,b+(r if r2 is None else r2)*ring,a,b]);fs=[]
  for i in range(k):j=(i+1)%k;fs.extend([(i,j,k+j),(i,k+j,k+i),(2*k,j,i),(2*k+1,k+i,k+j)])
  self.add(n,tm.Trimesh(vs,fs,process=False),h,mat)
 def tube(self,n,pts,r,h,mat='Rope',k=6):
  pts=np.array(pts);vs=[];fs=[]
  for i,p in enumerate(pts):
   axis=norm(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]);u=norm(np.cross(axis,[0,1,0] if abs(axis[1])<.9 else [1,0,0]));w=np.cross(axis,u);t=np.arange(k)*2*np.pi/k;vs.extend(p+r*(np.cos(t)[:,None]*u+np.sin(t)[:,None]*w))
  for i in range(len(pts)-1):
   for j in range(k):a=i*k+j;b=i*k+(j+1)%k;fs.extend([(a,b,b+k),(a,b+k,a+k)])
  vs.extend([pts[0],pts[-1]]);a=len(vs)-2;b=a+1
  for j in range(k):fs.extend([(a,(j+1)%k,j),(b,(len(pts)-1)*k+j,(len(pts)-1)*k+(j+1)%k)])
  self.add(n,tm.Trimesh(vs,fs,process=False),h,mat)
 def mesh(self,n,v,f,h,mat='Wood',colors=None):self.add(n,tm.Trimesh(v,f,process=False),h,mat,colors=colors)
 def crate(self,n,c,s=.12,col='B08A52'):
  x,y,z=c;self.box(n,c,[s,s*.85,s],col)
  for j in [-1,1]:
   self.box(n,[x+j*s*.39,y+s*.435,z],[s*.16,.014,s*1.03],'674327');self.box(n,[x,y+s*.435,z+j*s*.40],[s,.014,s*.12],'D0A36C')
   self.box(n,[x+j*s*.505,y,z],[.013,s*.85,s*.16],'704726')
  self.box(n,[x,y+s*.45,z],[s*.10,.014,s*.9],'D7AD73',ang=.75)
 def barrel(self,n,c,r=.08,length=.17,axis='y',col='8A5A30',k=12):
  c=np.array(c);rot=np.eye(3) if axis=='y' else np.array([[1,0,0],[0,0,-1],[0,1,0]])
  def point(v):return c+rot@np.array(v)
  # ring profile, faceted staves with variable wood color
  vs=[];fs=[];cs=[];rad=[.82,.97,1,.97,.82];ys=np.linspace(-length/2,length/2,5)
  for i,y in enumerate(ys):
   for j in range(k):
    t=j*2*np.pi/k;vs.append(point([r*rad[i]*np.cos(t),y,r*rad[i]*np.sin(t)]));cs.append(rgb(col)*(.78+.18*(j%3)/2+.12*max(0,np.sin(t))))
  for i in range(4):
   for j in range(k):a=i*k+j;b=i*k+(j+1)%k;fs.extend([(a,b,b+k),(a,b+k,a+k)])
  vs.extend([point([0,ys[0],0]),point([0,ys[-1],0])]);cs.extend([rgb('6B4A2C')]*2)
  for j in range(k):fs.extend([(5*k,(j+1)%k,j),(5*k+1,4*k+j,4*k+(j+1)%k)])
  self.mesh(n,vs,fs,col,colors=np.clip(cs,0,1))
  for q in [-.33,0,.33]:self.rod(n,point([0,q*length-.013,0]),point([0,q*length+.013,0]),r*(1.045 if q==0 else .985),'3B2A1C','Iron',k=k)
 def lantern(self,n,c,col='FFE27A'):
  x,y,z=c;self.box(n,c,[.053,.078,.053],col,'Lantern');
  for dy in [-.046,.046]:self.box(n,[x,y+dy,z],[.068,.017,.068],'443022','Iron')
  for dx in [-.03,.03]:
   for dz in [-.03,.03]:self.rod(n,[x+dx,y-.045,z+dz],[x+dx,y+.045,z+dz],.007,'513622','Iron',k=6)
 def export(self):
  # GLB generated explicitly, one named mesh and node per articulated part
  allv=np.vstack([m.vertices for items in self.parts.values() for m,_,_ in items]);lo=allv.min(0);hi=allv.max(0);off=np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2]);scale=1/((hi-lo)[1] if self.vertical else max((hi-lo)[[0,2]]))
  blob=bytearray();views=[];acc=[];nodes=[];meshes=[];materials=[];mid={};render=[]
  def accessor(a,typ,component,target):
   while len(blob)%4:blob.append(0)
   st=len(blob);raw=a.tobytes();blob.extend(raw);views.append(dict(buffer=0,byteOffset=st,byteLength=len(raw),target=target));d=dict(bufferView=len(views)-1,componentType=component,count=len(a),type=typ)
   if target==34962 and typ=='VEC3':d.update(min=a.min(0).tolist(),max=a.max(0).tolist())
   acc.append(d);return len(acc)-1
  def material(k):
   if k in mid:return mid[k]
   met,rough,em=M[k];d=dict(name=k,pbrMetallicRoughness=dict(baseColorFactor=(linear(rgb(em)).tolist()+[1] if em else [1,1,1,1]),metallicFactor=met,roughnessFactor=rough),alphaMode='OPAQUE',emissiveFactor=linear(rgb(em)).tolist() if em else [0,0,0]);mid[k]=len(materials);materials.append(d);return mid[k]
  for n,items in self.parts.items():
   piv=self.piv.get(n,np.zeros(3));pr=[]
   for mat in dict.fromkeys(x[1] for x in items):
    vv=[];ff=[];nn=[];cc=[];idx=0
    for m,k,c in items:
     if k!=mat:continue
     v=(m.vertices-piv)*scale;vv.append(v);ff.append(m.faces+idx);idx+=len(v);nn.append(m.vertex_normals);cc.append(np.ones_like(c) if M[mat][2] else linear(np.clip(c,0,1)));render.append(((m.vertices-off)*scale,m.faces,c,mat))
    v=np.vstack(vv).astype('<f4');f=np.vstack(ff).astype('<u4').ravel();normal=np.vstack(nn).astype('<f4');color=np.vstack(cc).astype('<f4');pr.append(dict(attributes=dict(POSITION=accessor(v,'VEC3',5126,34962),NORMAL=accessor(normal,'VEC3',5126,34962),COLOR_0=accessor(color,'VEC3',5126,34962)),indices=accessor(f,'SCALAR',5125,34963),material=material(mat)))
   meshes.append(dict(name=n,primitives=pr));nodes.append(dict(name=n,mesh=len(meshes)-1,translation=((piv-off)*scale).tolist()))
  # Relativize child transforms to the parent pivot.
  roots=list(range(len(nodes)));ix={n['name']:i for i,n in enumerate(nodes)}
  for child,parent in self.parents.items():
   ci,pi=ix[child],ix[parent];nodes[ci]['translation']=((self.piv[child]-self.piv[parent])*scale).tolist();nodes[pi].setdefault('children',[]).append(ci);roots.remove(ci)
  while len(blob)%4:blob.append(0)
  g=dict(asset=dict(version='2.0',generator='Faro procedural nautical assets'),scene=0,scenes=[dict(nodes=roots)],nodes=nodes,meshes=meshes,materials=materials,accessors=acc,bufferViews=views,buffers=[dict(byteLength=len(blob))]);j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);data=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\0')+blob
  out=P/'modelos'/f'{self.name}.glb';out.write_bytes(data);s=tm.load(out,force='scene',process=False);count=sum(len(m.faces) for m in s.geometry.values());b=s.bounds
  report=dict(file=out.name,triangles=count,bounds=b.tolist(),nodes=[n['name'] for n in nodes],materials=materials,closed_components=all(m.is_watertight and m.is_winding_consistent and m.volume>0 for items in self.parts.values() for m,_,_ in items),normals=all('NORMAL' in p['attributes'] for m in meshes for p in m['primitives']),size_ok=abs((np.ptp(b,axis=0)[1] if self.vertical else max(np.ptp(b,axis=0)[[0,2]]))-1)<.02 and abs(b[0,1])<.01,triangle_ok=count<8000,parents=self.parents, pivots={n:((p-off)*scale).tolist() for n,p in self.piv.items()}, dimensions=np.ptp(b,axis=0).tolist())
  print(self.name,count,report['closed_components'],report['size_ok'],flush=True)
  for angle,label in [(23,'32'),(157,'trasera')]:render_png(render,P/'vistas'/f'{self.name}-{label}.png',angle)
  return report

from numba import njit
@njit(cache=True)
def raster(im,depth,pts,cols):
 H,W=depth.shape
 for i in range(len(pts)):
  p=pts[i];c=cols[i];x0,y0,z0=p[0];x1,y1,z1=p[1];x2,y2,z2=p[2];den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
  if abs(den)<1e-8:continue
  for y in range(max(0,int(np.floor(min(y0,y1,y2)))),min(H,int(np.ceil(max(y0,y1,y2)))+1)):
   for x in range(max(0,int(np.floor(min(x0,x1,x2)))),min(W,int(np.ceil(max(x0,x1,x2)))+1)):
    a=((y1-y2)*(x+.5-x2)+(x2-x1)*(y+.5-y2))/den;b=((y2-y0)*(x+.5-x2)+(x0-x2)*(y+.5-y2))/den;d=1-a-b
    if a>=-1e-6 and b>=-1e-6 and d>=-1e-6:
     z=a*z0+b*z1+d*z2
     if z>depth[y,x]:
      depth[y,x]=z
      for k in range(3):im[y,x,k]=min(255,max(0,int(a*c[0,k]+b*c[1,k]+d*c[2,k])))
def render_png(items,path,az):
 a=np.deg2rad(az);e=np.deg2rad(32);cam=np.array([np.sin(a)*np.cos(e),np.sin(e),np.cos(a)*np.cos(e)]);right=norm(np.cross([0,1,0],cam));up=np.cross(cam,right);basis=np.stack([right,up,cam],axis=1)
 vv=np.vstack([v@basis for v,_,_,_ in items]);lo=vv.min(0);hi=vv.max(0);sc=1440/max((hi-lo)[:2]);center=(hi+lo)/2;faces=[];colors=[]
 for v,f,c,mat in items:
  p=v@basis;pts=p[f];n=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]);n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-10);visible=n@cam>0;light=np.clip(.65+.46*(n@norm(np.array([-0.6,1,.6])))+.18*(n@norm(np.array([.8,.1,-.6]))),.42,1.23);color=np.clip(c[f]*light[:,None,None],0,1)
  if M[mat][2]:color=np.clip(c[f]*1.13,0,1)
  pts[:,:,:2]=(pts[:,:,:2]-center[:2])*sc;pts[:,:,0]+=900;pts[:,:,1]=900-pts[:,:,1]
  faces.append(pts[visible]);colors.append(color[visible]*255)
 yy,xx=np.ogrid[:1800,:1800];r=np.sqrt(((xx-900)/1300)**2+((yy-800)/1300)**2);arr=np.clip(np.array([25,48,70])[None,None,:]*(1-.55*np.minimum(r,1))[...,None],0,255).astype(np.uint8);depth=np.full((1800,1800),-1e10,dtype=np.float64)
 raster(arr,depth,np.vstack(faces),np.vstack(colors));Image.fromarray(arr).resize((900,900),Image.Resampling.LANCZOS).save(path)

# Closed loft along Y, ring colors and profile variation.
def loft(A,n,center,rings,k,cols,mat='Wood',irreg=0,phase=0):
 x,y,z=center;vs=[];cs=[];fs=[]
 for i,(yy,rx,rz) in enumerate(rings):
  for j in range(k):
   t=2*np.pi*j/k;w=1+irreg*(.55*np.sin(3*t+phase)+.3*np.cos(5*t+phase)+.15*np.sin(7*t+i*.5));vs.append([x+rx*np.cos(t)*w,y+yy,z+rz*np.sin(t)*w]);c=rgb(cols[i] if isinstance(cols,list) else cols);cs.append(np.clip(c*(.90+.10*np.sin(t+phase)**2+.06*np.cos(3*t+phase)),0,1))
 for i in range(len(rings)-1):
  for j in range(k):a=i*k+j;b=i*k+(j+1)%k;fs.extend([(a,b,b+k),(a,b+k,a+k)])
 vs.extend([[x,y+rings[0][0],z],[x,y+rings[-1][0],z]]);cs.extend([cs[0],cs[-1]]);a=len(vs)-2;b=a+1
 for j in range(k):fs.extend([(a,(j+1)%k,j),(b,(len(rings)-1)*k+j,(len(rings)-1)*k+(j+1)%k)])
 A.mesh(n,vs,fs,cols[0] if isinstance(cols,list) else cols,mat,cs)

def ring(A,n,c,r,t,h,mat='Iron',axis='y',k=20):
 x,y,z=c;pts=[]
 for a in np.linspace(0,2*np.pi,k+1):
  if axis=='y':pts.append([x+r*np.cos(a),y,z+r*np.sin(a)])
  elif axis=='x':pts.append([x,y+r*np.cos(a),z+r*np.sin(a)])
  else:pts.append([x+r*np.cos(a),y+r*np.sin(a),z])
 # use true torus to avoid duplicated end caps
 m=tm.creation.torus(major_radius=r,minor_radius=t,major_sections=k,minor_sections=6)
 if axis=='y':m.apply_transform(tm.transformations.rotation_matrix(np.pi/2,[1,0,0]))
 if axis=='x':m.apply_transform(tm.transformations.rotation_matrix(np.pi/2,[0,1,0]))
 m.apply_translation(c);A.add(n,m,h,mat)


# Bevels, fitted masonry, grain lines, hollow visual barrel profiles.
def bevel(A,n,c,d,col,mat='Stone',b=.008):
 d=np.array(d)/2;b=min(b,min(d)*.45);vs=[]
 for i in range(3):
  for s in [-1,1]:
   for t in [-1,1]:
    for u in [-1,1]:
     q=np.array([s,t,u])*d
     for k in range(3):
      if k!=i:q[k]*=(d[k]-b)/d[k]
     vs.append(q+np.array(c))
 m=tm.convex.convex_hull(vs);A.add(n,m,col,mat,.11)
def flatblock(A,n,c,d,col,mat='Stone',b=.008):A.box(n,c,d,col,mat)
def plankgrain(A,n,c,d,col='8A5B35',vertical=False):
 bevel(A,n,c,d,col,'Wood',.005)
 x,y,z=c;dx,dy,dz=d
 for j in range(2):
  if dz>dx:
   a=[x+(j-.5)*dx*.52,y+dy*.505,z-dz*.34];b=[a[0]+dx*.09,a[1],z+dz*.34]
  else:
   a=[x-dx*.35,y+dy*.505,z+(j-.5)*dz*.48];b=[x+dx*.34,a[1],a[2]+dz*.09]
  A.rod(n,a,b,.0026,'503622','DarkWood',k=4)
def bolt(A,n,c,r=.014,col='98A0A7',mat='Iron',axis=(0,1,0)):
 c=np.array(c);u=np.array(axis)*.009;A.rod(n,c-u,c+u,r,col,mat,k=6)
def cyl(A,n,a,b,r,c,mat='Iron',k=24,r2=None):A.rod(n,a,b,r,c,mat,k=k,r2=r2)
def hollow(A,n,a,b,profile,mat='Iron',k=32):
 # Closed annular shell cross-section. Each ring: axial fraction, radius, color.
 a=np.array(a,float);b=np.array(b,float);axis=norm(b-a);u=norm(np.cross(axis,[1,0,0] if abs(axis[0])<.8 else [0,1,0]));v=np.cross(axis,u);vs=[];cs=[];fs=[]
 for t,r,col in profile:
  for j in range(k):
   theta=2*np.pi*j/k;vs.append(a+t*(b-a)+r*(np.cos(theta)*u+np.sin(theta)*v));cs.append(np.clip(rgb(col)*(.91+.08*np.sin(theta)+.045*np.cos(5*theta)),0,1))
 for i in range(len(profile)):
  ni=(i+1)%len(profile)
  for j in range(k):
   nj=(j+1)%k;fs.extend([(i*k+j,i*k+nj,ni*k+nj),(i*k+j,ni*k+nj,ni*k+j)])
 A.mesh(n,vs,fs,'50545D',mat,cs)
def disc(A,n,y0,y1,r,col,mat='Stone',k=32):cyl(A,n,[0,y0,0],[0,y1,0],r,col,mat,k)
def wheel(A,n,x,y,z,r):
 cyl(A,n,[x-.033,y,z],[x+.033,y,z],r,'795131','Wood',16)
 for side in [-1,1]:
  ring(A,n,[x+side*.036,y,z],r*.90,.012,'414853','Iron',axis='x',k=12)
  cyl(A,n,[x+side*.033,y,z],[x+side*.048,y,z],r*.29,'545D67','Iron',12)
  for i in range(6):
   t=i*np.pi/3;bolt(A,n,[x+side*.042,y+r*.64*np.cos(t),z+r*.64*np.sin(t)],.010,'9CA3A9','Iron',(1,0,0))
 # top visible grain on wheel face via dark seams
 for zoff in [-.045,.045]:
  A.rod(n,[x+.035,y-r*.78,z+zoff],[x+.035,y+r*.78,z+zoff],.003,'4D3220','DarkWood',k=4)
def wall():
 A=Asset('costa-muralla');n=A.part('Wall')
 # Core width and sides are exactly tileable. Grout is a dark backing beneath fitted blocks.
 A.box(n,[0,.105,0],[1,.21,.526],'4B535D','Recess')
 cols=['727D8B','848E9D','697481','909AA8','7C8797']
 for side in [-1,1]:
  for row in range(3):
   edges=np.linspace(-.5,.5,7) if row%2==0 else np.array([-.5,-.415,-.248,-.082,.085,.252,.419,.5])
   for i,(l,r) in enumerate(zip(edges[:-1],edges[1:])):
    # front facing ashlar with worn bevels; edges do not exceed width or depth
    (bevel if (i+row)%3==0 else flatblock)(A,n,[(l+r)/2,.038+row*.068,side*.264],[r-l-.006,.062,.022],cols[(i+row*2+(side==1))%len(cols)],b=.006)
 # top paving, flat middle lane and 3 sea-facing merlons
 A.box(n,[0,.218,-.028],[1,.016,.39],'646F7D','Recess')
 for i in range(6):
  for j in range(3):
   flatblock(A,n,[-.41667+i/6,.228,-.158+j*.13],[.161,.026,.124],['A3AAB8','919DAD','8A96A6'][(i+j)%3],b=.005)
 A.box(n,[0,.235,.214],[1,.05,.118],'788390','Stone')
 for x in [-.335,0,.335]:
  bevel(A,n,[x,.293,.214],[.223,.095,.116],'75818F',b=.009)
  bevel(A,n,[x,.343,.214],[.239,.024,.122],'A3AAB8',b=.004)
 # end buttresses are inset within the wall depth; matching full section faces
 for x in [-.446,.446]:
  for y in [.044,.111,.178]:bevel(A,n,[x,y,-.264],[.098,.064,.05],'939AA5',b=.006)
 # a few moss stains as shallow colored surface details, not extra scenery
 for x,z in [(-.29,.266),(.12,.266),(.25,-.266),(-.1,-.266)]:
  A.ell(n,[x,.021,z],[.029,.012,.005],'4F6744','Moss',0)
 return A
def dais():
 A=Asset('costa-hueco');n=A.part('Dais')
 loft(A,n,[0,0,0],[(0,.5,.5),(.034,.5,.5),(.13,.46,.46),(.148,.46,.46)],8,['5B6573','758090','8995A5','A3AAB8'],'Stone')
 # ring of fitted wedge blocks. Inner top lowered, visible raised rim.
 disc(A,n,.145,.151,.37,'626D7A','Recess',32)
 for i in range(8):
  t=i*np.pi/4;u=np.array([np.cos(t),0,np.sin(t)]);w=np.array([-u[2],0,u[0]]);c=.409*u+np.array([0,.163,0]);
  m=tm.creation.box([.28,.032,.105]);m.apply_transform(tm.transformations.rotation_matrix(-t+np.pi/2,[0,1,0]));m.apply_translation(c);A.add(n,m,['8A96A5','A3AAB8','8F9AAA'][i%3],'Stone')
 for t in np.arange(4)*np.pi/2+np.pi/4:
  x=.405*np.cos(t);z=.405*np.sin(t);cyl(A,n,[x,.174,z],[x,.183,z],.027,'414853','Iron',12);ring(A,n,[x,.192,z],.024,.008,'929DA7','Iron','y',k=12)
 # paving pattern inside inset (color lines only)
 for t in np.arange(8)*np.pi/4:
  A.rod(n,[.12*np.cos(t),.152,.12*np.sin(t)],[.34*np.cos(t),.152,.34*np.sin(t)],.003,'4D5663','Recess',k=4)
 return A
def cannon():
 A=Asset('arma-canon');A.part('Base');A.part('Head',[0,.25,0]);A.part('Barrel',[0,.40,0]);A.parents={'Barrel':'Head'}
 # fixed wooden carriage, wheels and axle
 for x in [-.15,.15]:
  plankgrain(A,'Base',[x,.115,0],[.12,.13,.65]);bevel(A,'Base',[x,.183,-.13],[.13,.11,.23],'825430','Wood')
  for z in [-.24,.18]:bevel(A,'Base',[x,.184,z],[.13,.025,.047],'414853','Iron',.005)
  wheel(A,'Base',x*1.56,.13,-.035,.13)
  for z in [-.26,.26]:bolt(A,'Base',[x,.19,z],.014)
 for z in [-.22,.23]:plankgrain(A,'Base',[0,.07,z],[.38,.10,.12],'674527')
 cyl(A,'Base',[-.28,.13,-.035],[.28,.13,-.035],.033,'414853','Iron',16)
 disc(A,'Base',.20,.25,.19,'414853','Iron',24)
 disc(A,'Head',.25,.30,.16,'7B858E','LightIron',24)
 for x in [-.125,.125]:
  bevel(A,'Head',[x,.344,0],[.085,.14,.22],'754C2C','Wood',.012)
  cyl(A,'Head',[x-.045,.40,0],[x+.045,.40,0],.065,'414853','Iron',20)
 # a decorative, hollow muzzle and sculpted rings. Not a functional mechanism.
 p=[(0,.078,'353A45'),(.04,.112,'5B6470'),(.10,.116,'454D58'),(.14,.104,'3B414D'),(.42,.098,'525B68'),(.70,.077,'3B414D'),(.86,.082,'525B68'),(.88,.106,'7C8793'),(.97,.106,'929DA6'),(1,.092,'626E7A'),(1,.057,'181C22'),(.94,.055,'232832'),(.06,.050,'2B3037'),(0,.050,'222731')]
 hollow(A,'Barrel',[0,.40,-.40],[0,.40,.50],p,k=24)
 for z,r in [(-.32,.113),(-.13,.103),(.28,.087),(.39,.103)]:
  cyl(A,'Barrel',[0,.40,z-.012],[0,.40,z+.012],r,'66717F','LightIron',20)
 A.ell('Barrel',[0,.40,-.444],[.052,.052,.052],'4B535E','Iron',1)
 cyl(A,'Barrel',[0,.48,-.22],[0,.506,-.22],.014,'A85A29','LightIron',12)
 for x in [-.105,.105]:cyl(A,'Barrel',[0,.40,0],[x*1.5,.40,0],.04,'788390','LightIron',20)
 for t in np.linspace(0,2*np.pi,8,endpoint=False):
  bolt(A,'Barrel',[.083*np.cos(t),.4+.083*np.sin(t),.488],.009,'B1B9BF','LightIron',(0,0,1))
 return A

def ballista():
 A=Asset('arma-ballesta');A.part('Base');A.part('Head',[0,.30,0]);A.part('Bow',[0,.43,.18]);A.part('Bolt',[0,.49,0]);A.parents={'Bow':'Head','Bolt':'Head'}
 for t in np.linspace(0,2*np.pi,3,endpoint=False):
  q=np.array([np.cos(t),0,np.sin(t)])
  bevel(A,'Base',q*.23+[0,.035,0],[.17,.07,.17],'73502F','Wood')
  A.rod('Base',q*.23+[0,.055,0],[0,.25,0],.055,'805632','Wood',k=10)
  bolt(A,'Base',q*.23+[0,.075,0],.018)
 disc(A,'Base',0,.075,.15,'76502D','Wood',16);disc(A,'Base',.075,.28,.10,'8F6138','Wood',12);disc(A,'Base',.27,.30,.12,'414853','Iron',20)
 disc(A,'Head',.30,.35,.115,'606A78','Iron',24)
 plankgrain(A,'Head',[0,.40,-.01],[.135,.11,.69],'986339')
 for x in [-.046,.046]:
  bevel(A,'Head',[x,.463,-.05],[.022,.018,.56],'414853','Iron',.004)
 for z in [-.28,-.10,.21]:
  bevel(A,'Head',[0,.40,z],[.15,.12,.055],'414853','Iron',.008)
  for x in [-.054,.054]:bolt(A,'Head',[x,.467,z],.012)
 # carved recurve bow limbs, iron collars and string to rear nock
 for s in [-1,1]:
  pts=np.array([[0,.43,.20],[s*.13,.43,.17],[s*.25,.425,.07],[s*.37,.43,-.07],[s*.46,.45,-.085],[s*.475,.465,-.025]])
  A.tube('Bow',pts,.035,'996A3E','Wood',k=12)
  # dark wood ridge follows curves
  A.tube('Bow',pts+np.array([0,.019,-.005]),.017,'604222','DarkWood',k=8)
  for j in [1,3,4]:
   v=pts[j];d=norm(pts[min(j+1,len(pts)-1)]-pts[j-1]);cyl(A,'Bow',v-d*.015,v+d*.015,.04,'48515D','Iron',16)
  A.rod('Bow',pts[-1],[0,.475,-.30],.012,'E8D9B0','Cord',k=8)
  bolt(A,'Bow',[s*.13,.468,.17],.013)
 # winch and handle ornament, stock-mounted
 cyl(A,'Head',[-.12,.405,-.28],[.12,.405,-.28],.047,'414853','Iron',20)
 for s in [-1,1]:
  cyl(A,'Head',[s*.12,.405,-.28],[s*.14,.405,-.28],.058,'8D683C','Wood',20)
  A.rod('Head',[s*.14,.405,-.28],[s*.14,.47,-.34],.012,'414853','Iron',k=8)
  A.rod('Head',[s*.14,.47,-.34],[s*.19,.47,-.34],.02,'81512F','Wood',k=8)
 cyl(A,'Bolt',[0,.49,-.31],[0,.49,.30],.013,'C49A64','Wood',12)
 # chunky faceted arrow-shaped decorative tip
 cyl(A,'Bolt',[0,.49,.275],[0,.49,.37],.036,'D0D8DF','Silver',k=8,r2=.001)
 for t in np.arange(3)*2*np.pi/3:
  u=np.array([np.cos(t),np.sin(t),0]);v=np.array([-np.sin(t),np.cos(t),0]);c=np.array([0,.49,-.27]);verts=[c+u*r+v*w+[0,0,z] for r,w,z in [(0,-.006,-.05),(.053,-.006,-.06),(.018,-.006,.05),(0,.006,-.05),(.053,.006,-.06),(.018,.006,.05)]]
  A.mesh('Bolt',verts,[(0,2,1),(3,4,5),(0,1,4),(0,4,3),(1,2,5),(1,5,4),(2,0,3),(2,3,5)],'B5AB90','Cord')
 return A
def mortar():
 A=Asset('arma-mortero');A.part('Base');A.part('Head',[0,.17,0]);A.part('Tube',[0,.29,-.10]);A.parents={'Tube':'Head'}
 for i in range(6):plankgrain(A,'Base',[-.405+i*.162,.055,0],[.159,.11,.94],'805531' if i%2 else '96643B')
 for x in [-.465,.465]:bevel(A,'Base',[x,.055,0],[.07,.11,1],'414853','Iron',.008)
 for z in [-.465,.465]:bevel(A,'Base',[0,.103,z],[.93,.037,.07],'414853','Iron')
 for x in [-.405,-.2,0,.2,.405]:
  for z in [-.465,.465]:bolt(A,'Base',[x,.13,z],.014)
 disc(A,'Base',.11,.17,.32,'424A54','Iron',24);disc(A,'Head',.17,.23,.28,'59646F','Iron',32)
 for x in [-.21,.21]:
  bevel(A,'Head',[x,.286,-.1],[.10,.16,.25],'48515C','Iron',.015)
  cyl(A,'Head',[x-.055,.29,-.1],[x+.055,.29,-.1],.07,'8A949D','Iron',24)
 a=np.array([0,.29,-.10]);axis=np.array([0,np.sin(np.deg2rad(55)),np.cos(np.deg2rad(55))]);b=a+.53*axis
 profile=[(0,.175,'574337'),(.07,.205,'74523A'),(.19,.212,'674735'),(.25,.186,'8C6548'),(.64,.168,'71503C'),(.75,.195,'946F50'),(.94,.205,'77543F'),(1,.199,'B38A61'),(1,.146,'1D1815'),(.88,.142,'2B2421'),(.07,.115,'3A2B24'),(0,.115,'2B2421')]
 hollow(A,'Tube',a,b,profile,'Bronze',32)
 for t,r in [(.12,.218),(.71,.197)]:
  # annular raised bands using small axial hollow profiles
  c=a+axis*(t*.53);hollow(A,'Tube',c-axis*.020,c+axis*.020,[(0,r-.015,'414853'),(.2,r,'88939D'),(.8,r,'5B6570'),(1,r-.014,'414853'),(1,r-.035,'414853'),(0,r-.035,'414853')],'Iron',24)
 hollow(A,'Tube',b-axis*.015,b+axis*.008,[(0,.197,'FF8A3D'),(1,.199,'FF8A3D'),(1,.146,'FF8A3D'),(0,.146,'FF8A3D')],'Ember',32)
 # dark interior at base, no visible opening through the object
 cyl(A,'Tube',a+axis*.006,a+axis*.026,.122,'221C19','Bronze',24)
 for s in [-1,1]:cyl(A,'Tube',a,a+[s*.23,0,0],.046,'606B76','Iron',16)
 return A

def coastlight():
 A=Asset('arma-luz');A.vertical=True;A.part('Tower');A.part('Lamp',[0,.70,0]);A.part('Roof',[0,.87,0]);A.parents={'Lamp':'Tower','Roof':'Tower'}
 loft(A,'Tower',[0,0,0],[(0,.24,.24),(.035,.25,.25),(.075,.25,.25),(.095,.19,.19),(.52,.16,.16),(.55,.22,.22),(.60,.22,.22)],16,['5C6674','758290','A3AAB8','778390','8895A3','A3AAB8','647080'],'Stone')
 # stone blocks following taper, subtle bevels and dark masonry seams
 for i in range(4):
  y=.145+i*.103;r=.186-i*.007
  for j in range(12):
   t=2*np.pi*(j+(i%2)*.5)/12
   m=tm.creation.box([.089,.091,.020]);m.apply_transform(tm.transformations.rotation_matrix(-t+np.pi/2,[0,1,0]));m.apply_translation([r*np.cos(t),y,r*np.sin(t)]);A.add('Tower',m,['8793A2','727F8D','A3AAB8','778391'][(j+i)%4],'Stone',.10)
 # small recessed dark window on the land side
 bevel(A,'Tower',[0,.30,-.183],[.085,.14,.022],'48525F','Recess',.008)
 for s in [-1,1]:bevel(A,'Tower',[s*.052,.30,-.19],[.024,.16,.026],'A3AAB8','Stone',.004)
 ring(A,'Tower',[0,.60,0],.222,.012,'414853','Iron',k=20)
 for t in np.linspace(0,2*np.pi,8,endpoint=False):
  x=.21*np.cos(t);z=.21*np.sin(t);cyl(A,'Tower',[x,.56,z],[x,.632,z],.011,'414853','Iron',8)
 ring(A,'Tower',[0,.634,0],.215,.011,'596472','Iron',k=20)
 A.ell('Lamp',[0,.727,0],[.117,.118,.117],'FFE9A8','Glass',2)
 for y in [.631,.827]:disc(A,'Lamp',y,y+.020,.151,'414853','Iron',24)
 for t in np.linspace(0,2*np.pi,6,endpoint=False):
  x=.14*np.cos(t);z=.14*np.sin(t);cyl(A,'Lamp',[x,.65,z],[x,.83,z],.010,'53616F','Iron',8)
 # angled hood encircling the forward-facing light
 hollow(A,'Lamp',[0,.727,.076],[0,.727,.20],[(0,.12,'414853'),(.15,.137,'64717D'),(1,.145,'7B8994'),(1,.119,'B7C2CB'),(0,.105,'596472')],'Iron',24)
 loft(A,'Roof',[0,0,0],[(.844,.184,.184),(.866,.184,.184),(.949,.034,.034),(.965,.018,.018)],20,['343E50','66768A','46556B','425269'],'Slate')
 A.ell('Roof',[0,.98,0],[.020,.020,.020],'3FD7C4','Slate',1)
 return A

def torch():
 A=Asset('costa-antorcha');A.vertical=True;n=A.part('Torch')
 bevel(A,n,[0,.055,0],[.22,.11,.22],'414853','Iron',.012)
 cyl(A,n,[0,.11,0],[0,.70,0],.065,'795334','Wood',10,r2=.047)
 for y in [.16,.35,.57,.68]:cyl(A,n,[0,y-.017,0],[0,y+.017,0],.075,'414853','Iron',10)
 # decorative empty cup with dark bundle, no flame
 hollow(A,n,[0,.70,0],[0,.87,0],[(0,.064,'414853'),(.24,.09,'59616D'),(.85,.145,'69747F'),(1,.15,'89939B'),(1,.125,'353A42'),(.28,.067,'33383F'),(0,.041,'30343B')],'Iron',12)
 A.ell(n,[0,.85,0],[.102,.128,.099],'382820','Wood',1)
 # charred wrapping and tiny ember, game supplies the animated flame
 pts=[[.086*np.cos(t),.80+.105*t/(2*np.pi*1.6),.086*np.sin(t)] for t in np.linspace(0,2*np.pi*1.6,14)]
 A.tube(n,pts,.012,'514035','Wood',k=5)
 A.ell(n,[0,.985,0],[.024,.015,.024],'FF8A3D','Ember',0)
 return A

if __name__=='__main__':
 (P/'modelos').mkdir(exist_ok=True);(P/'vistas').mkdir(exist_ok=True)
 reports=[]
 budgets={'costa-muralla':(800,2000),'costa-hueco':(500,1200),'arma-canon':(2000,4500),'arma-ballesta':(1800,4000),'arma-mortero':(1500,3500),'arma-luz':(1200,3000),'costa-antorcha':(300,800)}
 for fn in [wall,dais,cannon,ballista,mortar,coastlight,torch]:
  a=fn();r=a.export();mn,mx=budgets[a.name];r['requested_triangle_range']=[mn,mx];r['within_requested_range']=mn<=r['triangles']<=mx;reports.append(r)
 (P/'verificacion.json').write_text(json.dumps(reports,indent=2,ensure_ascii=False,default=lambda x:x.item()))
 # Contact sheet from actual geometry previews.
 names=['costa-muralla','costa-hueco','arma-canon','arma-ballesta','arma-mortero','arma-luz','costa-antorcha'];labels=['Muralla modular','Base de arma','Cañón','Ballesta','Mortero','Luz de costa','Antorcha'];font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';f=ImageFont.truetype(font,26);title=ImageFont.truetype(font,38);out=Image.new('RGB',(1440,1585),(12,24,37));d=ImageDraw.Draw(out);d.text((36,22),'FARO EN LA TORMENTA | MODO COSTA',font=title,fill='#E8DED0');
 for i,(n,l) in enumerate(zip(names,labels)):
  x=20+(i%3)*470;y=86+(i//3)*495;im=Image.open(P/'vistas'/f'{n}-trasera.png').resize((450,450),Image.Resampling.LANCZOS);out.paste(im,(x,y));d.text((x+12,y+455),l,font=f,fill='#E6D9C4')
 out.save(P/'catalogo.png')
