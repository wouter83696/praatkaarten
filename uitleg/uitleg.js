fetch('uitleg-data.json')
.then(r=>r.json())
.then(data=>{
 const c=document.getElementById('cards');
 Object.keys(data).forEach(k=>{
  const d=document.createElement('div');
  d.className='card';
  d.innerHTML=`<img src="../cards/${k}.svg"><div class="desc">${data[k]}</div>`;
  c.appendChild(d);
 });
});