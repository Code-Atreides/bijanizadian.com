export function streetStops(extension=0){
  const end=28.5+Math.max(0,extension);
  return Array.from({length:Math.round((end+28.5)/9.5)+1},(_,i)=>-28.5+i*9.5);
}
export function streetStep(z,direction,extension=0){
  const stops=streetStops(extension);
  return direction>0?stops.find(stop=>stop>z+.1)??stops.at(-1):[...stops].reverse().find(stop=>stop<z-.1)??stops[0];
}
export function createStreetNavigation(T,extension=0){
  const root=new T.Group(),pickables=[];root.name='street-navigation';root.visible=false;
  // Invisible road segments preserve click-to-move without drawing ground markers.
  for(const z of streetStops(extension)){
    const marker=new T.Group();marker.position.set(0,.25,z);root.add(marker);
    const hit=new T.Mesh(new T.PlaneGeometry(8.5,9.5),new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));hit.rotation.x=-Math.PI/2;hit.userData.streetZ=z;marker.add(hit);pickables.push(hit);
  }
  return {root,pickables,update(z,theta){for(const marker of root.children){marker.visible=Math.abs(marker.position.z-z)>4&&Math.abs(marker.position.z-z)<39;marker.rotation.y=Math.cos(theta)>0?0:Math.PI;}},dispose(){const geometry=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material);});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
