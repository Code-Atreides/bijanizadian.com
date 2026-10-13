// One logical pixel is always an integer square of device pixels. The canvas
// overhangs the viewport by less than one cell rather than stretching to fit it.
export function pixelViewport(width,height,dpr=1){
 const ratio=Number.isFinite(dpr)&&dpr>0?dpr:1;
 // A finer 32-bit-era grid reveals the native roof tiles and sprite shading.
 const pixel=Math.max(1,Math.round(2*ratio));
 const columns=Math.ceil(width*ratio/pixel),rows=Math.ceil(height*ratio/pixel);
 return {pixel,columns,rows,dpr:ratio,width:columns*pixel,height:rows*pixel,cssWidth:columns*pixel/ratio,cssHeight:rows*pixel/ratio,baseScale:width<640?1.7:2};
}
export function pixelView(viewport,camera){
 const {pixel,columns,rows,dpr,baseScale}=viewport;
 const ideal=pixel/dpr/baseScale/Math.max(.03,camera.zoom);
 const step=ideal>=1?Math.min(96,Math.round(ideal)):1/Math.max(1,Math.min(4,Math.round(1/ideal)));
 const width=columns*step,height=rows*step;
 const x=Math.round((camera.x-width/2)/step)*step,y=Math.round((camera.y-height/2)/step)*step;
 return {x,y,width,height,step,zoom:1/step,pixel,columns,rows,worldPerPixel:step/pixel};
}
export function worldPoint(view,x,y){return {x:view.x+x*view.worldPerPixel,y:view.y+y*view.worldPerPixel};}
export function screenPoint(view,x,y){return {x:(x-view.x)/view.worldPerPixel,y:(y-view.y)/view.worldPerPixel};}
export function fitZoom(viewport,width,height){
 const step=Math.max(1,Math.ceil(Math.max(width/viewport.columns,height/viewport.rows)));
 return viewport.pixel/viewport.dpr/viewport.baseScale/step;
}
