// app.js — SOLO JS (sin <html>, <head> ni <script>)
// Crea botón fijo "Cerrar sesión" y expone window.initUserApp(root, user)

(function ensureFixedSignout(){
  if (!document.getElementById('mf-signout-fixed')) {
    const css = `
      #mf-signout-fixed{
        position:fixed;top:10px;right:10px;z-index:2000;
        background:#ef4444;color:#fff;border:0;border-radius:12px;
        padding:10px 14px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.15);
        font-weight:600
      }
      #mf-signout-fixed:hover{filter:brightness(.95)}
    `;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const b = document.createElement('button');
    b.id = 'mf-signout-fixed';
    b.textContent = 'Cerrar sesión';
    b.addEventListener('click', () => {
      try {
        if (window.firebase && firebase.auth) firebase.auth().signOut();
        else window.location.reload();
      } catch { window.location.reload(); }
    });
    document.body.appendChild(b);
  }
})();

// -------------------------------------------------------------
// window.initUserApp(root, user)
// -------------------------------------------------------------
window.initUserApp = function(root, user){
  // STORAGE por usuario
  const USER_PREFIX = `mf2.${user.uid}.`;
  const STORAGE_KEY = USER_PREFIX + "finanzas_total_v6_fechas_emojis";

  // ====== Datos base + carga inicial ======
  const MESES=["01-Enero","02-Febrero","03-Marzo","04-Abril","05-Mayo","06-Junio","07-Julio","08-Agosto","09-Septiembre","10-Octubre","11-Noviembre","12-Diciembre"];
  let data = JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
  if(!data.categorias){
    data.categorias={
      "Comida":["Supermercado","Delivery"],
      "Servicios":["Luz","Agua","Internet"],
      "Transporte":["Nafta","Peaje"]
    };
  }
  if(!data.gastos) data.gastos=[];
  if(!data.ingresos) data.ingresos=[];
  if(!data.config) data.config={dolar:1000,anio:(new Date()).getFullYear()};
  if(!data.presupuestosPorSubcat) data.presupuestosPorSubcat={};
  if(!data.inflacion) data.inflacion={};
  if(!data.presuIngresos) data.presuIngresos={};
  if(!data.ahorro) data.ahorro={};
  if(!data.recurrentes) data.recurrentes=[];
  if(!data.notas) data.notas=[];
  if(!data.catObjetivos) data.catObjetivos={};
  if(!data.alertasCat) data.alertasCat={};
  if(!data.historial) data.historial=[];
  if(!data.usdHist) data.usdHist=[];
  if(!data.carteras) data.carteras=["General"];
  if(!data.deudas) data.deudas=[];
  if(!data.objAnual) data.objAnual={ahorro:0};

  // ====== Helpers / atajos ======
  const $ = s => document.querySelector(s);
  function guardarData(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }
  function keyMes(){ return selAnio.value+"-"+selMes.value; }
  function descomponerFechaISO(str){ const [y,m,d]=str.split("-"); return {anio:parseInt(y), mes:m, dia:d}; }
  function hoyISO(){ return new Date().toISOString().split("T")[0]; }
  function clearAlerts(){ alertCenter.innerHTML=""; }
  function addAlert(txt,level="warn"){
    const div=document.createElement("div");
    const bg=level==="error"?"#fee2e2":level==="ok"?"#dcfce7":"#fef9c3";
    const bd=level==="error"?"#ef4444":level==="ok"?"#22c55e":"#f97316";
    div.style.cssText=`background:${bg};border:1px solid ${bd};border-radius:.45rem;padding:.3rem .55rem;font-size:.68rem;display:flex;justify-content:space-between;align-items:center`;
    div.innerHTML=`<span>${txt}</span><button style="background:transparent;border:none;cursor:pointer" type="button">✖</button>`;
    div.querySelector("button").onclick=()=>div.remove();
    alertCenter.appendChild(div);
  }
  function normalizarFecha(val){
    if(!val) return "";
    if(val.includes("/")){
      const p=val.split("/");const d=p[0].padStart(2,"0"),m=p[1].padStart(2,"0");
      const y=p[2]||((new Date()).getFullYear());
      return `${y}-${m}-${d}`;
    }
    return val;
  }
  function liberarFechas(){
    const f1=inpFecha, f2=inpFechaIng;
    if(f1){f1.removeAttribute("min");f1.min="1900-01-01";}
    if(f2){f2.removeAttribute("min");f2.min="1900-01-01";}
  }

  // ====== Elementos del DOM (ya existen en index.html) ======
  const selMes=$("#selMes");
  const selAnio=$("#selAnio");
  const selCartera=$("#selCartera");
  const inpDolar=$("#inpDolar");
  const lblMesActual=$("#lblMesActual");
  const fechaSistemaEl=$("#fechaSistema");
  const fechaRealEl=$("#fechaReal");
  const alertCenter=$("#alertCenter");
  const globalSearch=$("#globalSearch");
  const globalResults=$("#globalResults");
  const btnGuardarConfig=$("#btnGuardarConfig");
  const btnExportar=$("#btnExportar");
  const btnExportCSV=$("#btnExportCSV");
  const btnImportar=$("#btnImportar");
  const fileImport=$("#fileImport");
  const btnImprimir=$("#btnImprimir");
  const chkDark=$("#chkDark");
  const chkReadonly=$("#chkReadonly");

  const contenedorCategorias=$("#contenedorCategorias");
  const inpCategoria=$("#inpCategoria");
  const btnAgregarCategoria=$("#btnAgregarCategoria");
  const selCatObjetivo=$("#selCatObjetivo");
  const inpCatObjetivo=$("#inpCatObjetivo");
  const inpCatAlerta=$("#inpCatAlerta");
  const btnGuardarCatObjetivo=$("#btnGuardarCatObjetivo");

  const selCategoria=$("#selCategoria");
  const selSubcategoria=$("#selSubcategoria");
  const inpFecha=$("#inpFecha");
  const inpDesc=$("#inpDesc");
  const inpTags=$("#inpTags");
  const inpMonto=$("#inpMonto");
  const selMoneda=$("#selMoneda");
  const selCarteraGasto=$("#selCarteraGasto");
  const btnAgregarGasto=$("#btnAgregarGasto");
  const tablaGastos=document.querySelector("#tablaGastos tbody");
  const filtroGastosEl=$("#filtroGastos");

  const inpFechaIng=$("#inpFechaIng");
  const selTipoIng=$("#selTipoIng");
  const inpDescIng=$("#inpDescIng");
  const inpMontoIng=$("#inpMontoIng");
  const selMonedaIng=$("#selMonedaIng");
  const selCarteraIng=$("#selCarteraIng");
  const btnAgregarIngreso=$("#btnAgregarIngreso");
  const tablaIngresos=document.querySelector("#tablaIngresos tbody");
  const inpPresuIng=$("#inpPresuIng");
  const btnGuardarPresuIng=$("#btnGuardarPresuIng");

  const kpiPresupuesto=$("#kpiPresupuesto");
  const kpiGastado=$("#kpiGastado");
  const kpiIngresos=$("#kpiIngresos");
  const kpiSaldo=$("#kpiSaldo");
  const kpiGastadoUSD=$("#kpiGastadoUSD");
  const kpiPresuIng=$("#kpiPresuIng");
  const kpiPctIng=$("#kpiPctIng");
  const kpiScore=$("#kpiScore");
  const kpiVolatilidad=$("#kpiVolatilidad");
  const kpiInsight=$("#kpiInsight");

  const tablaPresuSubcatBody=document.querySelector("#tablaPresuSubcat tbody");
  const chart1=$("#chartPresupuesto");
  const chart2=$("#chartCategorias");
  const chartInflacion=$("#chartInflacion");
  const chartUsd=$("#chartUsd");
  const listaUsd=$("#listaUsd");
  const contenedorAnual=$("#contenedorAnual");
  const inpInflacion=$("#inpInflacion");
  const btnGuardarInflacion=$("#btnGuardarInflacion");

  const progressFill=$("#progressFill");
  const progressText=$("#progressText");

  const inpAhorroMeta=$("#inpAhorroMeta");
  const btnGuardarAhorro=$("#btnGuardarAhorro");
  const txtAhorroEstado=$("#txtAhorroEstado");
  const txtComparativoMes=$("#txtComparativoMes");
  const txtProyeccionMes=$("#txtProyeccionMes");
  const txtDolarAlerta=$("#txtDolarAlerta");
  const txtCashflow=$("#txtCashflow");
  const txtHoySemana=$("#txtHoySemana");
  const listaTopCat=$("#listaTopCat");
  const listaTags=$("#listaTags");
  const inpNota=$("#inpNota");
  const btnAgregarNota=$("#btnAgregarNota");
  const listaNotas=$("#listaNotas");

  const recDia=$("#recDia");
  const recDesc=$("#recDesc");
  const recMonto=$("#recMonto");
  const recCat=$("#recCat");
  const recSub=$("#recSub");
  const recCartera=$("#recCartera");
  const btnAddRec=$("#btnAddRec");
  const listaRecurrentes=$("#listaRecurrentes");
  const btnAplicarRecurrentes=$("#btnAplicarRecurrentes");

  const inpCarteraNueva=$("#inpCarteraNueva");
  const btnAddCartera=$("#btnAddCartera");
  const listaCarteras=$("#listaCarteras");

  const simDolar=$("#simDolar");
  const simGastoPct=$("#simGastoPct");
  const simIngPct=$("#simIngPct");
  const btnSimular=$("#btnSimular");
  const txtSimResultado=$("#txtSimResultado");

  const deuDesc=$("#deuDesc");
  const deuSaldo=$("#deuSaldo");
  const deuVto=$("#deuVto");
  const btnAddDeuda=$("#btnAddDeuda");
  const listaDeudas=$("#listaDeudas");
  const txtDeudaMes=$("#txtDeudaMes");

  const inpObjAnual=$("#inpObjAnual");
  const btnObjAnual=$("#btnObjAnual");
  const txtObjAnualEstado=$("#txtObjAnualEstado");

  let filtroGastosValor="";
  let editingGastoId=null;
  let readOnly=false;

  // ====== Inicializaciones varias ======
  function initSelectors(){
    selMes.innerHTML="";
    MESES.forEach((m,i)=>{const o=document.createElement("option");o.value=String(i+1).padStart(2,"0");o.textContent=m;selMes.appendChild(o);});
    const hoy=new Date();
    selMes.value=String(hoy.getMonth()+1).padStart(2,"0");
    selAnio.innerHTML="";
    const yNow=hoy.getFullYear();
    for(let y=yNow-3;y<=yNow+1;y++){const o=document.createElement("option");o.value=y;o.textContent=y;selAnio.appendChild(o);}
    selAnio.value=data.config.anio||yNow;
    inpDolar.value=data.config.dolar||1000;
    inpFecha.valueAsDate=hoy;
    inpFechaIng.valueAsDate=hoy;
    liberarFechas();
  }
  function actualizarFechasHeader(){
    const d=new Date();const pad=n=>String(n).padStart(2,"0");
    fechaSistemaEl.textContent=`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    fechaRealEl.textContent=`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
  }
  setInterval(actualizarFechasHeader,1000);

  function renderCarterasSelects(){
    selCartera.innerHTML="";
    const all=document.createElement("option");all.value="__all__";all.textContent="Todas";selCartera.appendChild(all);
    data.carteras.forEach(c=>{
      const o=document.createElement("option");o.value=c;o.textContent=c;selCartera.appendChild(o);
    });
    selCarteraGasto.innerHTML="";
    data.carteras.forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;selCarteraGasto.appendChild(o);});
    selCarteraIng.innerHTML="";
    data.carteras.forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;selCarteraIng.appendChild(o);});
    recCartera.innerHTML="";
    data.carteras.forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;recCartera.appendChild(o);});
  }
  function renderCarterasPanel(){
    listaCarteras.innerHTML="";
    data.carteras.forEach(c=>{
      const li=document.createElement("li");
      li.style.marginBottom=".35rem";
      li.innerHTML=`${c} <button class="mini-btn" data-del="${c}" type="button">🗑️</button>`;
      listaCarteras.appendChild(li);
    });
    listaCarteras.querySelectorAll("button[data-del]").forEach(b=>{
      b.onclick=()=>{
        if(readOnly) return;
        const c=b.dataset.del;
        if(c==="General") return alert("No borres la cartera base 😭");
        if(confirm("¿Eliminar cartera?")){
          data.carteras=data.carteras.filter(x=>x!==c);
          guardarData();renderCarterasSelects();renderCarterasPanel();renderGastos();renderIngresos();recalc();
        }
      };
    });
  }
  function renderRecurrentesCatSub(){
    recSub.innerHTML="";
    (data.categorias[recCat.value]||[]).forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;recSub.appendChild(o);});
  }
  function renderCatObjetivosSelect(){
    selCatObjetivo.innerHTML="";
    Object.keys(data.categorias).forEach(c=>{
      const o=document.createElement("option");o.value=c;o.textContent=c;selCatObjetivo.appendChild(o);
    });
  }
  function renderSelects(){
    selCategoria.innerHTML="";
    recCat.innerHTML="";
    Object.keys(data.categorias).forEach(c=>{
      const o=document.createElement("option");o.value=c;o.textContent=c;selCategoria.appendChild(o);
      const o2=document.createElement("option");o2.value=c;o2.textContent=c;recCat.appendChild(o2);
    });
    updateSub();renderRecurrentesCatSub();
  }
  function updateSub(){
    selSubcategoria.innerHTML="";
    (data.categorias[selCategoria.value]||[]).forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;selSubcategoria.appendChild(o);});
  }
  function loadHeader(){
    lblMesActual.textContent=MESES[parseInt(selMes.value)-1].split("-")[1]+" "+selAnio.value;
    inpAhorroMeta.value=data.ahorro[keyMes()]||"";
    inpPresuIng.value=data.presuIngresos[keyMes()]||"";
  }

  // ====== Handlers top bar ======
  btnGuardarConfig.onclick=()=>{
    const old=data.config.dolar;
    data.config.dolar=parseFloat(inpDolar.value||1);
    data.config.anio=parseInt(selAnio.value);
    if(old!==data.config.dolar){ data.usdHist.push({ts:Date.now(),valor:data.config.dolar}); }
    guardarData();recalc();renderGraficos();renderInflacion();renderUsdHist();
    alert("Configuración guardada ✅");
  };
  btnExportar.onclick=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="mis_finanzas.json";a.click();URL.revokeObjectURL(url);
  };
  btnExportCSV.onclick=()=>{
    let rows=["tipo,fecha,cartera,categoria,subcategoria,descripcion,tags,montoARS,monedaOriginal,montoOriginal"];
    data.gastos.forEach(g=>{
      rows.push(`gasto,${g.fecha},${g.cartera||"General"},${g.cat},${g.subcat||""},"${(g.desc||"").replace(/"/g,'""')}",${(g.tags||"").replace(/"/g,'""')},${g.montoARS},${g.monedaOriginal},${g.montoOriginal}`);
    });
    data.ingresos.forEach(i=>{
      rows.push(`ingreso,${i.fecha},${i.cartera||"General"},,,${(i.desc||"").replace(/"/g,'""')},,${i.montoARS},${i.monedaOriginal},${i.montoOriginal}`);
    });
    const blob=new Blob([rows.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="finanzas.csv";a.click();URL.revokeObjectURL(url);
  };
  btnImportar.onclick=()=>fileImport.click();
  fileImport.onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{ data=JSON.parse(ev.target.result); guardarData(); initAfterDataChange(); alert("Importado ✅"); }
      catch{ alert("Error al importar JSON"); }
    };
    r.readAsText(f);
  };
  btnImprimir.onclick=()=>window.print();

  // ====== Categorías ======
  function renderCategoriasPanel(){
    contenedorCategorias.innerHTML="";
    Object.keys(data.categorias).forEach(cat=>{
      const block=document.createElement("div");block.className="cat-block";
      const head=document.createElement("div");head.className="cat-header";
      const objetivo=data.catObjetivos[cat]?`<span class="small">🎯 $${data.catObjetivos[cat].toLocaleString("es-AR")}</span>`:"";
      const alerta=data.alertasCat[cat]?`<span class="small">⚠️ ${data.alertasCat[cat]}%</span>`:"";
      head.innerHTML=`<span>🗂️ <strong>${cat}</strong> ${objetivo} ${alerta}</span>`;
      const divBtns=document.createElement("div");
      const bAdd=document.createElement("button");bAdd.className="mini-btn";bAdd.textContent="➕";bAdd.type="button";
      bAdd.onclick=()=>{
        if(readOnly) return;
        const n=prompt("Nombre de la subcategoría:");if(n){if(!data.categorias[cat].includes(n)){data.categorias[cat].push(n);guardarData();renderCategoriasPanel();renderSelects();renderPresupuestoPorSubcat();}}
      };
      const bEd=document.createElement("button");bEd.className="mini-btn";bEd.textContent="✏️";bEd.type="button";
      bEd.onclick=()=>{
        if(readOnly) return;
        const nuevo=prompt("Nuevo nombre de la categoría:",cat);
        if(nuevo && nuevo!==cat){
          data.categorias[nuevo]=data.categorias[cat];delete data.categorias[cat];
          if(data.catObjetivos[cat]){data.catObjetivos[nuevo]=data.catObjetivos[cat];delete data.catObjetivos[cat];}
          if(data.alertasCat[cat]){data.alertasCat[nuevo]=data.alertasCat[cat];delete data.alertasCat[cat];}
          Object.keys(data.presupuestosPorSubcat).forEach(k=>{
            const old=data.presupuestosPorSubcat[k];const neu={};
            Object.keys(old).forEach(k2=>{
              const [c,s]=k2.split("::");
              if(c===cat) neu[`${nuevo}::${s}`]=old[k2]; else neu[k2]=old[k2];
            });
            data.presupuestosPorSubcat[k]=neu;
          });
          data.gastos.forEach(g=>{if(g.cat===cat)g.cat=nuevo;});
          guardarData();renderCategoriasPanel();renderSelects();renderGastos();renderPresupuestoPorSubcat();recalc();renderGraficos();
        }
      };
      const bDel=document.createElement("button");bDel.className="mini-btn";bDel.textContent="🗑️";bDel.type="button";
      bDel.onclick=()=>{
        if(readOnly) return;
        if(confirm("¿Eliminar categoría y sus subcategorías?")){
          delete data.categorias[cat];delete data.catObjetivos[cat];delete data.alertasCat[cat];
          guardarData();renderCategoriasPanel();renderSelects();renderGastos();renderPresupuestoPorSubcat();recalc();renderGraficos();
        }
      };
      divBtns.appendChild(bAdd);divBtns.appendChild(bEd);divBtns.appendChild(bDel);
      head.appendChild(divBtns);block.appendChild(head);
      const subList=document.createElement("div");subList.className="subcat-list";
      data.categorias[cat].forEach(sub=>{
        const row=document.createElement("div");row.className="subcat-item";
        row.innerHTML=`<span>🔹 ${sub}</span>`;
        const sb=document.createElement("div");
        const se=document.createElement("button");se.className="mini-btn";se.textContent="✏️";se.type="button";
        se.onclick=()=>{
          if(readOnly) return;
          const nn=prompt("Nuevo nombre de la subcategoría:",sub);
          if(nn && nn!==sub){
            const arr=data.categorias[cat];arr[arr.indexOf(sub)]=nn;
            Object.keys(data.presupuestosPorSubcat).forEach(k=>{
              const old=data.presupuestosPorSubcat[k];const neu={};
              Object.keys(old).forEach(k2=>{
                const [c,s]=k2.split("::");
                if(c===cat && s===sub) neu[`${c}::${nn}`]=old[k2]; else neu[k2]=old[k2];
              });
              data.presupuestosPorSubcat[k]=neu;
            });
            data.gastos.forEach(g=>{if(g.cat===cat && g.subcat===sub) g.subcat=nn;});
            guardarData();renderCategoriasPanel();renderSelects();renderGastos();renderPresupuestoPorSubcat();recalc();renderGraficos();
          }
        };
        const sd=document.createElement("button");sd.className="mini-btn";sd.textContent="🗑️";sd.type="button";
        sd.onclick=()=>{
          if(readOnly) return;
          if(confirm("¿Eliminar subcategoría?")){
            data.categorias[cat]=data.categorias[cat].filter(x=>x!==sub);
            guardarData();renderCategoriasPanel();renderSelects();renderGastos();renderPresupuestoPorSubcat();recalc();renderGraficos();
          }
        };
        sb.appendChild(se);sb.appendChild(sd);row.appendChild(sb);subList.appendChild(row);
      });
      block.appendChild(subList);contenedorCategorias.appendChild(block);
    });
    renderCatObjetivosSelect();
    renderRecurrentesCatSub();
  }
  btnAgregarCategoria.onclick=()=>{
    if(readOnly) return;
    const c=inpCategoria.value.trim();if(!c)return;
    if(!data.categorias[c]) data.categorias[c]=[];
    guardarData();inpCategoria.value="";renderCategoriasPanel();renderSelects();renderPresupuestoPorSubcat();
  };
  btnGuardarCatObjetivo.onclick=()=>{
    if(readOnly) return;
    const cat=selCatObjetivo.value;
    const val=parseFloat(inpCatObjetivo.value||0);
    const al=parseFloat(inpCatAlerta.value||0);
    data.catObjetivos[cat]=val;
    if(al>0) data.alertasCat[cat]=al;
    guardarData();renderCategoriasPanel();alert("Objetivo/alerta de categoría guardado ✅");
  };
  selCategoria.onchange=updateSub;
  recCat.onchange=renderRecurrentesCatSub;

  // ====== Gastos ======
  btnAgregarGasto.onclick=()=>{
    if(readOnly) return;
    let fecha=normalizarFecha(inpFecha.value);
    if(!fecha) return alert("Poné fecha");
    if(fecha>hoyISO() && !confirm("La fecha está en el futuro. ¿Guardar igual?")) return;
    const {anio,mes}=descomponerFechaISO(fecha);
    const cat=selCategoria.value;const sub=selSubcategoria.value||"";const desc=inpDesc.value||"";const tags=inpTags.value||"";
    let monto=parseFloat(inpMonto.value||0);if(monto<=0)return alert("Monto inválido");
    const moneda=selMoneda.value;let tc=1;
    if(moneda==="USD") tc=parseFloat(inpDolar.value||data.config.dolar||1);
    const montoARS=moneda==="ARS"?monto:monto*tc;
    const cartera=selCarteraGasto.value||"General";
    if(editingGastoId){
      const g=data.gastos.find(x=>x.id===editingGastoId);
      if(g){
        data.historial.push({ts:Date.now(),tipo:"gasto-edit",prev:{...g}});
        g.fecha=fecha;g.cat=cat;g.subcat=sub;g.desc=desc;g.tags=tags;
        g.montoARS=parseFloat(montoARS.toFixed(2));
        g.anio=anio;g.mes=mes;
        g.monedaOriginal=moneda;g.montoOriginal=monto;g.tcUsado=tc;
        g.cartera=cartera;
      }
      editingGastoId=null;
      btnAgregarGasto.textContent="✅ Guardar gasto";
    }else{
      data.gastos.push({id:Date.now(),fecha,cat,subcat:sub,desc,tags,montoARS:parseFloat(montoARS.toFixed(2)),anio,mes,monedaOriginal:moneda,montoOriginal:monto,tcUsado:tc,cartera});
    }
    guardarData();selAnio.value=anio;selMes.value=mes;loadHeader();
    renderGastos();recalc();renderGraficos();renderPresupuestoPorSubcat();renderTagsReport();
    inpDesc.value="";inpMonto.value="";inpTags.value="";
  };
  function filtroPorCartera(item){
    const sc=selCartera.value;
    if(sc==="__all__") return true;
    return (item.cartera||"General")===sc;
  }
  function renderGastos(){
    const anio=selAnio.value, mes=selMes.value;
    tablaGastos.innerHTML="";
    data.gastos
      .filter(g=>String(g.anio)===anio && String(g.mes)===mes)
      .filter(filtroPorCartera)
      .sort((a,b)=>b.fecha.localeCompare(a.fecha))
      .forEach(g=>{
        if(filtroGastosValor){
          const txt=(g.cat+" "+(g.subcat||"")+" "+(g.desc||"")+" "+(g.tags||"")).toLowerCase();
          if(!txt.includes(filtroGastosValor)) return;
        }
        const tr=document.createElement("tr");
        const nota=(g.monedaOriginal!=="ARS")?` <span class="small" style="color:#64748b">(${g.monedaOriginal} ${g.montoOriginal} @${g.tcUsado||"-"})</span>`:"";
        tr.innerHTML=`<td>${g.fecha}</td><td>${g.cat}</td><td>${g.subcat||"-"}</td><td>${g.desc||""}</td><td>${g.tags||""}</td><td>${g.cartera||"General"}</td><td>$ ${g.montoARS.toLocaleString("es-AR",{minimumFractionDigits:2})}${nota}</td><td class="no-print"><button type="button" class="btn danger" style="font-size:.6rem" data-del="${g.id}">🗑️</button><button type="button" class="btn" style="background:#e2e8f0;font-size:.6rem" data-ed="${g.id}">✏️</button><button type="button" class="btn" style="background:#fee2e2;font-size:.6rem" data-hist="${g.id}">🕓</button></td>`;
        tablaGastos.appendChild(tr);
      });
    tablaGastos.querySelectorAll("button[data-del]").forEach(b=>{
      b.onclick=()=>{
        if(readOnly) return;
        const id=parseInt(b.dataset.del);
        if(confirm("¿Eliminar gasto?")){
          data.gastos=data.gastos.filter(g=>g.id!==id);
          guardarData();renderGastos();recalc();renderGraficos();renderPresupuestoPorSubcat();renderTagsReport();
        }
      };
    });
    tablaGastos.querySelectorAll("button[data-ed]").forEach(b=>{
      b.onclick=()=>{
        if(readOnly) return;
        const g=data.gastos.find(x=>x.id===parseInt(b.dataset.ed));
        if(!g) return;
        inpFecha.value=g.fecha;
        selCategoria.value=g.cat;
        updateSub();
        if(g.subcat) selSubcategoria.value=g.subcat;
        inpDesc.value=g.desc||"";
        inpTags.value=g.tags||"";
        selMoneda.value=g.monedaOriginal||"ARS";
        inpMonto.value=g.montoOriginal;
        selCarteraGasto.value=g.cartera||"General";
        editingGastoId=g.id;
        btnAgregarGasto.textContent="💾 Actualizar gasto";
        inpMonto.focus();
      };
    });
    tablaGastos.querySelectorAll("button[data-hist]").forEach(b=>{
      b.onclick=()=>{
        const id=parseInt(b.dataset.hist);
        const items=data.historial.filter(h=>h.tipo==="gasto-edit" && h.prev && h.prev.id===id);
        if(!items.length){alert("Sin historial para este gasto");return;}
        let msg="Historial de ediciones:\n";
        items.forEach(it=>{
          const d=new Date(it.ts);
          msg+=`- ${d.toLocaleString()} -> ${it.prev.fecha} ${it.prev.cat}/${it.prev.subcat} $${it.prev.montoARS}\n`;
        });
        alert(msg);
      };
    });
  }
  filtroGastosEl.oninput=()=>{filtroGastosValor=filtroGastosEl.value.toLowerCase();renderGastos();};

  // ====== Ingresos ======
  btnAgregarIngreso.onclick=()=>{
    if(readOnly) return;
    let fecha=normalizarFecha(inpFechaIng.value);
    if(!fecha) return alert("Poné fecha de ingreso");
    if(fecha>hoyISO() && !confirm("La fecha está en el futuro. ¿Guardar igual?")) return;
    const {anio,mes}=descomponerFechaISO(fecha);
    const tipo=selTipoIng.value;const desc=inpDescIng.value||"";
    let monto=parseFloat(inpMontoIng.value||0);if(monto<=0)return alert("Monto inválido");
    const moneda=selMonedaIng.value;let tc=1;
    if(moneda==="USD") tc=parseFloat(inpDolar.value||data.config.dolar||1);
    const montoARS=moneda==="ARS"?monto:monto*tc;
    const cartera=selCarteraIng.value||"General";
    data.ingresos.push({id:Date.now(),fecha,tipo,desc,montoARS:parseFloat(montoARS.toFixed(2)),anio,mes,monedaOriginal:moneda,montoOriginal:monto,tcUsado:tc,cartera});
    guardarData();renderIngresos();recalc();
    inpDescIng.value="";inpMontoIng.value="";
  };
  function renderIngresos(){
    const anio=selAnio.value, mes=selMes.value;
    tablaIngresos.innerHTML="";
    data.ingresos
      .filter(i=>String(i.anio)===anio && String(i.mes)===mes)
      .filter(filtroPorCartera)
      .sort((a,b)=>b.fecha.localeCompare(a.fecha))
      .forEach(i=>{
        const nota=(i.monedaOriginal!=="ARS")?` <span class="small" style="color:#64748b">(${i.monedaOriginal} ${i.montoOriginal} @${i.tcUsado||"-"})</span>`:"";
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${i.fecha}</td><td>${i.tipo}</td><td>${i.desc||""}</td><td>${i.cartera||"General"}</td><td>$ ${i.montoARS.toLocaleString("es-AR",{minimumFractionDigits:2})}${nota}</td><td class="no-print"><button class="btn danger" style="font-size:.6rem" data-id="${i.id}" type="button">🗑️</button></td>`;
        tablaIngresos.appendChild(tr);
      });
    tablaIngresos.querySelectorAll("button[data-id]").forEach(b=>{
      b.onclick=()=>{
        if(readOnly) return;
        const id=parseInt(b.dataset.id);
        if(confirm("¿Eliminar ingreso?")){
          data.ingresos=data.ingresos.filter(i=>i.id!==id);
          guardarData();renderIngresos();recalc();
        }
      };
    });
    inpPresuIng.value=data.presuIngresos[keyMes()]||"";
  }
  btnGuardarPresuIng.onclick=()=>{
    if(readOnly) return;
    const k=keyMes();
    const v=parseFloat(inpPresuIng.value||0);
    data.presuIngresos[k]=isNaN(v)?0:v;
    guardarData();recalc();alert("Presupuesto de ingresos guardado ✅");
  };

  // ====== Presupuesto por subcategoría ======
  function renderPresupuestoPorSubcat(){
    const k=keyMes();
    const presuMap=data.presupuestosPorSubcat[k]||{};
    const anio=selAnio.value, mes=selMes.value;
    const gastosMes=data.gastos.filter(g=>String(g.anio)===anio && String(g.mes)===mes);
    const gastoPorSub={};
    gastosMes.forEach(g=>{
      const ky=`${g.cat}::${g.subcat||""}`;
      gastoPorSub[ky]=(gastoPorSub[ky]||0)+g.montoARS;
    });
    tablaPresuSubcatBody.innerHTML="";
    Object.keys(data.categorias).forEach(cat=>{
      const subs=data.categorias[cat];
      const makeRow=(ky,subTxt)=>{
        const pVal=presuMap[ky]||0;
        const gast=gastoPorSub[ky]||0;
        const dif=pVal-gast;
        let pct=0;
        if(pVal>0) pct=((gast-pVal)/pVal)*100;
        else if(pVal===0 && gast>0) pct=100;
        const esRojo=pct>0;
        const flecha=esRojo?"🔺":"🔻";
        const colorPct=esRojo?"#ef4444":"#10b981";
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${cat}</td>
          <td>${subTxt}</td>
          <td><input type="number" data-key="${ky}" value="${pVal}" style="width:5rem"></td>
          <td>$ ${gast.toLocaleString("es-AR",{maximumFractionDigits:0})}</td>
          <td style="color:${dif<0?"#ef4444":"#10b981"}">$ ${dif.toLocaleString("es-AR",{maximumFractionDigits:0})}</td>
          <td style="color:${colorPct}">${flecha} ${Math.round(pct)}%</td>`;
        tablaPresuSubcatBody.appendChild(tr);
      };
      if(subs.length===0){ makeRow(`${cat}::`,"(sin)"); }
      else { subs.forEach(sub=> makeRow(`${cat}::${sub}`, sub)); }
    });
  }
  document.getElementById("btnGuardarPresuSubcat").onclick=()=>{
    if(readOnly) return;
    const k=keyMes();const obj={};
    tablaPresuSubcatBody.querySelectorAll("input[data-key]").forEach(inp=>{
      const val=parseFloat(inp.value||0);if(val>0) obj[inp.dataset.key]=val;
    });
    data.presupuestosPorSubcat[k]=obj;guardarData();recalc();renderGraficos();alert("Presupuesto por subcategoría guardado ✅");
  };
  function calcularPresupuestoDesdeSubcats(){
    const k=keyMes();const obj=data.presupuestosPorSubcat[k]||{};let total=0;Object.values(obj).forEach(v=>total+=v);return total;
  }

  // ====== Visión anual ======
  function renderVisionAnual(){
    const anio=selAnio.value;contenedorAnual.innerHTML="";
    for(let m=1;m<=12;m++){
      const mm=String(m).padStart(2,"0");
      const gastosMes=data.gastos.filter(g=>String(g.anio)===anio && String(g.mes)===mm);
      const ingresosMes=data.ingresos.filter(i=>String(i.anio)===anio && String(i.mes)===mm);
      const totalG=gastosMes.reduce((a,g)=>a+g.montoARS,0);
      const totalI=ingresosMes.reduce((a,i)=>a+i.montoARS,0);
      const presu=(data.presupuestosPorSubcat[anio+"-"+mm]?Object.values(data.presupuestosPorSubcat[anio+"-"+mm]).reduce((a,b)=>a+b,0):0);
      const div=document.createElement("div");div.className="annual-card";
      div.innerHTML=`<div><strong>${MESES[m-1].split("-")[1]}</strong> 📅</div>
        <div>🟢 $ ${totalI.toLocaleString("es-AR",{maximumFractionDigits:0})}</div>
        <div>🔴 $ ${totalG.toLocaleString("es-AR",{maximumFractionDigits:0})}</div>
        <div>🎯 $ ${presu.toLocaleString("es-AR",{maximumFractionDigits:0})}</div>`;
      contenedorAnual.appendChild(div);
    }
  }

  // ====== Inflación ======
  btnGuardarInflacion.onclick=()=>{
    if(readOnly) return;
    const val=parseFloat(inpInflacion.value||0);if(isNaN(val)||val<0)return alert("Valor inválido");
    const k=keyMes();data.inflacion[k]=val;guardarData();renderInflacion();alert("Inflación guardada ✅");
  };
  function renderInflacion(){
    const anio=selAnio.value;const ctx=chartInflacion.getContext("2d");
    const w=ctx.canvas.width=ctx.canvas.clientWidth||320;
    const h=ctx.canvas.height=ctx.canvas.clientHeight||200;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle="#0f172a";ctx.font="12px sans-serif";ctx.fillText("Inflación "+anio,10,15);
    const vals=MESES.map((m,i)=>data.inflacion[anio+"-"+String(i+1).padStart(2,"0")]||0);
    const max=Math.max(...vals,5);
    const bottom=h-30,top=25,ch=bottom-top;
    const step=(w-50)/((vals.length-1)||1);
    ctx.strokeStyle="#38bdf8";ctx.lineWidth=2;ctx.beginPath();
    vals.forEach((v,i)=>{
      const x=35+i*step;
      const y=bottom-(v/max)*ch;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    vals.forEach((v,i)=>{
      const x=35+i*step;const y=bottom-(v/max)*ch;
      ctx.fillStyle="#0f172a";ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
      if(v) ctx.fillText(v.toFixed(1),x-8,y-6);
    });
  }

  // ====== Gráficos simples ======
  function drawBarChart(ctx,labels,values,title){
    if(!ctx) return;
    const w=ctx.canvas.width=ctx.canvas.clientWidth||320;
    const h=ctx.canvas.height=ctx.canvas.clientHeight||200;
    ctx.clearRect(0,0,w,h);
    const max=Math.max(...values,1);
    const bottom=h-30,top=25,ch=bottom-top;
    ctx.fillStyle="#0f172a";ctx.font="12px sans-serif";ctx.fillText(title,10,15);
    const bw=(w-40)/values.length;
    values.forEach((v,i)=>{
      const bh=(v/max)*ch;
      const x=20+i*bw;
      const y=bottom-bh;
      ctx.fillStyle=i===0?"#38bdf8":"#10b981";
      ctx.fillRect(x,y,bw-10,bh);
      ctx.fillStyle="#0f172a";ctx.fillText(labels[i],x,bottom+12);
    });
  }
  function drawPieChart(ctx,dataObj,title){
    if(!ctx) return;
    const w=ctx.canvas.width=ctx.canvas.clientWidth||320;
    const h=ctx.canvas.height=ctx.canvas.clientHeight||200;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle="#0f172a";ctx.font="12px sans-serif";ctx.fillText(title,10,15);
    const entries=Object.entries(dataObj).filter(e=>e[1]>0);
    if(!entries.length){ctx.fillText("Sin datos",10,35);return;}
    const total=entries.reduce((a,e)=>a+e[1],0);
    const cx=w/2,cy=h/2+5,r=Math.min(w,h)/3;let start=0;
    entries.forEach((e,i)=>{
      const ang=(e[1]/total)*Math.PI*2;
      ctx.beginPath();ctx.moveTo(cx,cy);
      ctx.fillStyle=`hsl(${(i*50)%360},85%,60%)`;
      ctx.arc(cx,cy,r,start,start+ang);ctx.closePath();ctx.fill();
      start+=ang;
    });
  }
  function renderGraficos(){
    const anio=selAnio.value, mes=selMes.value;
    const presupuesto=calcularPresupuestoDesdeSubcats();
    const gastosMes=data.gastos.filter(g=>String(g.anio)===anio && String(g.mes)===mes).filter(filtroPorCartera);
    const total=gastosMes.reduce((a,g)=>a+g.montoARS,0);
    drawBarChart(chart1.getContext("2d"),["Presu","Gastado"],[presupuesto,total],"Comparativa del mes");
    const porCat={};gastosMes.forEach(g=>{porCat[g.cat]=(porCat[g.cat]||0)+g.montoARS;});
    drawPieChart(chart2.getContext("2d"),porCat,"Por categoría");
  }
  function renderUsdHist(){
    const ctx=chartUsd.getContext("2d");
    const w=ctx.canvas.width=ctx.canvas.clientWidth||320;
    const h=ctx.canvas.height=ctx.canvas.clientHeight||120;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle="#0f172a";ctx.font="11px sans-serif";ctx.fillText("Histórico dólar",10,12);
    const hist=data.usdHist||[];
    listaUsd.innerHTML="";
    if(!hist.length){ctx.fillText("Sin datos",10,30);return;}
    hist.slice().reverse().forEach(item=>{
      const li=document.createElement("li");
      const d=new Date(item.ts);
      li.textContent=`${d.toLocaleString()} -> $${item.valor}`;
      listaUsd.appendChild(li);
    });
    const max=Math.max(...hist.map(h=>h.valor),1);
    const step=(w-40)/Math.max(hist.length-1,1);
    const bottom=h-20,top=25,ch=bottom-top;
    ctx.strokeStyle="#38bdf8";ctx.beginPath();
    hist.forEach((p,i)=>{
      const x=20+i*step;
      const y=bottom-(p.valor/max)*ch;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }

  // ====== Recalculo general ======
  function recalc(){
    const anio=selAnio.value, mes=selMes.value;
    const presupuesto=calcularPresupuestoDesdeSubcats();
    const gastosMes=data.gastos.filter(g=>String(g.anio)===anio && String(g.mes)===mes).filter(filtroPorCartera);
    const totalG=gastosMes.reduce((a,g)=>a+g.montoARS,0);
    const ingresosMes=data.ingresos.filter(i=>String(i.anio)===anio && String(i.mes)===mes).filter(filtroPorCartera);
    const totalI=ingresosMes.reduce((a,i)=>a+i.montoARS,0);
    const dolar=parseFloat(inpDolar.value||1);
    const gastoUSD=dolar>0?(totalG/dolar):0;
    const saldo=totalI-totalG;
    const presuIng=data.presuIngresos[keyMes()]||0;
    kpiPresupuesto.textContent=presupuesto.toLocaleString("es-AR",{minimumFractionDigits:2});
    kpiGastado.textContent=totalG.toLocaleString("es-AR",{minimumFractionDigits:2});
    kpiIngresos.textContent=totalI.toLocaleString("es-AR",{minimumFractionDigits:2});
    kpiSaldo.textContent=saldo.toLocaleString("es-AR",{minimumFractionDigits:2});
    kpiSaldo.classList.toggle("tone-ok",saldo>=0);
    kpiSaldo.classList.toggle("tone-bad",saldo<0);
    kpiGastadoUSD.textContent=gastoUSD.toLocaleString("es-AR",{minimumFractionDigits:2});
    kpiPresuIng.textContent=presuIng.toLocaleString("es-AR",{minimumFractionDigits:2});
    let pctIng=0;
    if(presuIng>0) pctIng=(totalI/presuIng)*100;
    kpiPctIng.textContent=pctIng.toFixed(0)+"%";
    if(presupuesto>0){
      const pct=Math.min((totalG/presupuesto)*100,140);
      progressFill.style.width=pct+"%";
      progressText.textContent=Math.round((totalG/presupuesto)*100)+"%";
      if(totalG>presupuesto) progressFill.classList.add("danger"); else progressFill.classList.remove("danger");
    }else{
      progressFill.style.width="0%";progressText.textContent="Sin presupuesto";progressFill.classList.remove("danger");
    }
    const meta=data.ahorro[keyMes()]||0;
    if(meta>0){
      const ah=saldo;
      txtAhorroEstado.textContent = (ah>=meta) ? "✅ Meta de ahorro alcanzada" : `Te faltan $${(meta-ah).toLocaleString("es-AR")}`;
    }else txtAhorroEstado.textContent="Sin meta de ahorro para este mes.";
    renderVisionAnual();
    clearAlerts();
    if(presupuesto>0 && totalG>presupuesto){
      addAlert(`⚠️ Te pasaste del presupuesto. Gastaste $${totalG.toLocaleString("es-AR")} y el tope era $${presupuesto.toLocaleString("es-AR")}`,"error");
    }else if(presupuesto>0 && totalG>=presupuesto*0.9){
      addAlert(`🟠 Estás al ${Math.round((totalG/presupuesto)*100)}% del presupuesto.`,"warn");
    }
    const gastoPorCat={};
    gastosMes.forEach(g=>{gastoPorCat[g.cat]=(gastoPorCat[g.cat]||0)+g.montoARS;});
    Object.keys(data.alertasCat).forEach(cat=>{
      const pct=data.alertasCat[cat];
      const objVal=data.catObjetivos[cat]||0;
      const gVal=gastoPorCat[cat]||0;
      if(objVal>0 && gVal>=objVal*(pct/100)){
        addAlert(`⚠️ ${cat} alcanzó el ${Math.round((gVal/objVal)*100)}% del objetivo`,"warn");
      }
    });
    txtCashflow.textContent=`Ingresos $${totalI.toLocaleString("es-AR")} - Gastos $${totalG.toLocaleString("es-AR")} = $${saldo.toLocaleString("es-AR")}`;
    txtHoySemana.textContent="Hoy es "+(new Date()).toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"short"});
    let score=50;
    if(presupuesto>0){
      const ratio=totalG/presupuesto;
      if(ratio<0.5) score+=20;
      else if(ratio<0.8) score+=10;
      else score-=10;
    }
    if(saldo>0) score+=10; else score-=10;
    kpiScore.textContent=score;
    kpiInsight.textContent=saldo>=0?"Vas bien, estás en positivo.":"Cortá gastos este mes 😅";
    const vals=Object.values(gastoPorCat);
    let vol=0;
    if(vals.length>1){
      const prom=vals.reduce((a,b)=>a+b,0)/vals.length;
      const varr=vals.reduce((a,b)=>a+Math.pow(b-prom,2),0)/vals.length;
      vol=Math.sqrt(varr)/prom*100;
    }
    kpiVolatilidad.textContent=isNaN(vol)? "0%":vol.toFixed(0)+"%";
    if(presupuesto>0){
      txtComparativoMes.textContent=`Llevás gastado el ${Math.round((totalG/presupuesto)*100)}% del presupuesto.`;
      txtProyeccionMes.textContent=(totalG>presupuesto)?"Vas a cerrar pasado.":"Vas por debajo, bien.";
    }
    txtDolarAlerta.textContent=data.config.dolar>2000?"⚠️ Dólar muy alto, revisá compras en USD.":"";
    renderTopCategorias();
    renderDeudas();
    renderObjAnualEstado();
  }
  btnGuardarAhorro.onclick=()=>{
    if(readOnly) return;
    const v=parseFloat(inpAhorroMeta.value||0);
    data.ahorro[keyMes()]=isNaN(v)?0:v;
    guardarData();recalc();
  };
  function renderTopCategorias(){
    const anio=selAnio.value;
    const map={};
    data.gastos.filter(g=>String(g.anio)===anio).forEach(g=>{map[g.cat]=(g.cat in map?map[g.cat]:0)+g.montoARS;});
    const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
    listaTopCat.innerHTML="";
    arr.forEach(([cat,tot])=>{
      const li=document.createElement("li");
      li.textContent=`${cat}: $${tot.toLocaleString("es-AR",{maximumFractionDigits:0})}`;
      listaTopCat.appendChild(li);
    });
  }

  // ====== Notas ======
  btnAgregarNota.onclick=()=>{
    if(readOnly) return;
    const t=inpNota.value.trim();if(!t) return;
    data.notas.push({id:Date.now(),txt:t,ts:Date.now()});
    guardarData();renderNotas();inpNota.value="";
  };
  function renderNotas(){
    listaNotas.innerHTML="";
    data.notas.slice().reverse().forEach(n=>{
      const li=document.createElement("li");
      const d=new Date(n.ts);
      li.innerHTML=`${d.toLocaleDateString()} - ${n.txt} <button type="button" class="mini-btn" data-del="${n.id}">🗑️</button>`;
      listaNotas.appendChild(li);
    });
    listaNotas.querySelectorAll("button[data-del]").forEach(b=>{
      b.onclick=()=>{
        if(readOnly) return;
        const id=parseInt(b.dataset.del);
        data.notas=data.notas.filter(n=>n.id!==id);
        guardarData();renderNotas();
      };
    });
  }

  // ====== Recurrentes ======
  btnAddRec.onclick=()=>{
    if(readOnly) return;
    const dia=parseInt(recDia.value||1);
    const desc=recDesc.value||"";
    const monto=parseFloat(recMonto.value||0);
    const cat=recCat.value;const sub=recSub.value||"";const cartera=recCartera.value||"General";
    if(!desc || monto<=0) return alert("Completar recurrente");
    data.recurrentes.push({id:Date.now(),dia,desc,monto,cat,sub,cartera});
    guardarData();renderRecurrentes();
    recDesc.value="";recMonto.value="";
  };
  function renderRecurrentes(){
    listaRecurrentes.innerHTML="";
    data.recurrentes.forEach(r=>{
      const li=document.createElement("li");
      li.innerHTML=`día ${r.dia}: ${r.desc} $${r.monto} (${r.cat}/${r.sub||"-"} en ${r.cartera}) <button class="mini-btn" data-del="${r.id}" type="button">🗑️</button>`;
      listaRecurrentes.appendChild(li);
    });
    listaRecurrentes.querySelectorAll("button[data-del]").forEach(b=>{
      b.onclick=()=>{
        if(readOnly) return;
        const id=parseInt(b.dataset.del);
        data.recurrentes=data.recurrentes.filter(x=>x.id!==id);
        guardarData();renderRecurrentes();
      };
    });
  }
  btnAplicarRecurrentes.onclick=()=>{
    if(readOnly) return;
    const anio=selAnio.value, mes=selMes.value;
    const dolar=parseFloat(inpDolar.value||1);
    data.recurrentes.forEach(r=>{
      const fecha=`${anio}-${mes}-${String(r.dia).padStart(2,"0")}`;
      data.gastos.push({
        id:Date.now()+Math.floor(Math.random()*9999),
        fecha,
        cat:r.cat,
        subcat:r.sub||"",
        desc:r.desc,
        tags:"recurrente",
        montoARS:r.monto,
        anio:parseInt(anio),
        mes:mes,
        monedaOriginal:"ARS",
        montoOriginal:r.monto,
        tcUsado:dolar,
        cartera:r.cartera||"General"
      });
    });
    guardarData();renderGastos();recalc();renderGraficos();renderPresupuestoPorSubcat();alert("Recurrentes volcados ✅");
  };

  // ====== Deudas ======
  btnAddDeuda.onclick=()=>{
    if(readOnly) return;
    const desc=deuDesc.value.trim();const saldo=parseFloat(deuSaldo.value||0);const vto=deuVto.value||"";
    if(!desc||saldo<=0) return alert("Completá la deuda");
    data.deudas.push({id:Date.now(),desc,saldo,vto});
    guardarData();renderDeudas();
    deuDesc.value="";deuSaldo.value="";deuVto.value="";
  };
  function renderDeudas(){
    listaDeudas.innerHTML="";
    let totalMes=0;
    const mesActual=keyMes();
    data.deudas.forEach(d=>{
      const li=document.createElement("li");
      li.innerHTML=`${d.desc} - $${d.saldo.toLocaleString("es-AR")} ${d.vto?("(vto "+d.vto+")"):""} <button class="mini-btn" data-del="${d.id}" type="button">🗑️</button>`;
      listaDeudas.appendChild(li);
      if(d.vto && d.vto.startsWith(mesActual)) totalMes+=d.saldo;
    });
    txtDeudaMes.textContent=totalMes>0?`Este mes vence aprox $${totalMes.toLocaleString("es-AR")}`:"";
    listaDeudas.querySelectorAll("button[data-del]").forEach(b=>{
      b.onclick=()=>{
        if(readOnly) return;
        const id=parseInt(b.dataset.del);
        data.deudas=data.deudas.filter(x=>x.id!==id);
        guardarData();renderDeudas();
      };
    });
  }

  // ====== Tags ======
  function renderTagsReport(){
    const anio=selAnio.value, mes=selMes.value;
    const map={};
    data.gastos.filter(g=>String(g.anio)===anio && String(g.mes)===mes).forEach(g=>{
      (g.tags||"").split(" ").forEach(t=>{
        t=t.trim();
        if(!t) return;
        if(!t.startsWith("#")) t="#"+t;
        map[t]=(map[t]||0)+g.montoARS;
      });
    });
    listaTags.innerHTML="";
    Object.entries(map).sort((a,b)=>b[1]-a[1]).forEach(([tag,val])=>{
      const li=document.createElement("li");
      li.textContent=`${tag}: $${val.toLocaleString("es-AR",{maximumFractionDigits:0})}`;
      listaTags.appendChild(li);
    });
  }

  // ====== Simulador ======
  btnSimular.onclick=()=>{
    const anio=selAnio.value, mes=selMes.value;
    const gastosMes=data.gastos.filter(g=>String(g.anio)===anio && String(g.mes)===mes);
    const ingresosMes=data.ingresos.filter(i=>String(i.anio)===anio && String(i.mes)===mes);
    let totalG=gastosMes.reduce((a,g)=>a+g.montoARS,0);
    let totalI=ingresosMes.reduce((a,i)=>a+i.montoARS,0);
    const d=parseFloat(simDolar.value||0);
    const gP=parseFloat(simGastoPct.value||0);
    const iP=parseFloat(simIngPct.value||0);
    if(gP) totalG=totalG*(1+gP/100);
    if(iP) totalI=totalI*(1+iP/100);
    let msg=`Gastos sim: $${totalG.toLocaleString("es-AR")} / Ingresos sim: $${totalI.toLocaleString("es-AR")} -> Saldo $${(totalI-totalG).toLocaleString("es-AR")}`;
    if(d>0) msg+=` | USD ref: ${d}`;
    txtSimResultado.textContent=msg;
  };

  // ====== Búsqueda global ======
  globalSearch.oninput=()=>{
    const q=globalSearch.value.toLowerCase();
    if(!q){globalResults.classList.add("hidden");return;}
    const res=[];
    data.gastos.forEach(g=>{
      const txt=(g.cat+" "+(g.subcat||"")+" "+(g.desc||"")+" "+(g.tags||"")).toLowerCase();
      if(txt.includes(q)) res.push({tipo:"gasto",txt:`${g.fecha} ${g.cat}/${g.subcat||""} $${g.montoARS}`,id:g.id});
    });
    data.ingresos.forEach(i=>{
      const txt=(i.tipo+" "+(i.desc||"")).toLowerCase();
      if(txt.includes(q)) res.push({tipo:"ing",txt:`${i.fecha} ${i.tipo} $${i.montoARS}`,id:i.id});
    });
    data.notas.forEach(n=>{
      if(n.txt.toLowerCase().includes(q)) res.push({tipo:"nota",txt:n.txt,id:n.id});
    });
    globalResults.innerHTML="<h4>Resultados</h4>";
    res.slice(0,30).forEach(r=>{
      const d=document.createElement("div");d.textContent=r.txt;globalResults.appendChild(d);
    });
    globalResults.classList.remove("hidden");
  };

  // ====== Objetivo anual ======
  btnObjAnual.onclick=()=>{
    if(readOnly) return;
    data.objAnual.ahorro=parseFloat(inpObjAnual.value||0);
    guardarData();renderObjAnualEstado();
  };
  function renderObjAnualEstado(){
    const anio=selAnio.value;
    const obj=data.objAnual.ahorro||0;
    if(!obj){txtObjAnualEstado.textContent="Sin objetivo anual de ahorro";return;}
    let ah=0;
    for(let m=1;m<=12;m++){
      const mm=String(m).padStart(2,"0");
      const ing=data.ingresos.filter(i=>String(i.anio)===anio && String(i.mes)===mm).reduce((a,b)=>a+b.montoARS,0);
      const ga=data.gastos.filter(i=>String(i.anio)===anio && String(i.mes)===mm).reduce((a,b)=>a+b.montoARS,0);
      ah+=Math.max(0,ing-ga);
    }
    txtObjAnualEstado.textContent=`Ahorro acumulado $${ah.toLocaleString("es-AR")} / Objetivo $${obj.toLocaleString("es-AR")}`;
    inpObjAnual.value=obj||"";
  }

  // ====== Readonly + Dark ======
  chkReadonly.onchange=()=>{ readOnly=chkReadonly.checked; document.body.classList.toggle("read-only",readOnly); };
  chkDark.onchange=()=>{ document.body.classList.toggle("dark",chkDark.checked); guardarData(); };

  // ====== Cambios de mes / año / cartera ======
  selMes.onchange = ()=>{loadHeader();renderGastos();renderIngresos();renderPresupuestoPorSubcat();recalc();renderGraficos();renderInflacion();renderTagsReport();};
  selAnio.onchange= ()=>{loadHeader();renderGastos();renderIngresos();renderPresupuestoPorSubcat();recalc();renderGraficos();renderInflacion();renderTagsReport();};
  selCartera.onchange=()=>{renderGastos();renderIngresos();recalc();renderGraficos();};

  // ====== Inicio ======
  function renderUsdHist(){
    const ctx=chartUsd.getContext("2d");
    const w=ctx.canvas.width=ctx.canvas.clientWidth||320;
    const h=ctx.canvas.height=ctx.canvas.clientHeight||120;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle="#0f172a";ctx.font="11px sans-serif";ctx.fillText("Histórico dólar",10,12);
    const hist=data.usdHist||[];
    listaUsd.innerHTML="";
    if(!hist.length){ctx.fillText("Sin datos",10,30);return;}
    hist.slice().reverse().forEach(item=>{
      const li=document.createElement("li");
      const d=new Date(item.ts);
      li.textContent=`${d.toLocaleString()} -> $${item.valor}`;
      listaUsd.appendChild(li);
    });
    const max=Math.max(...hist.map(h=>h.valor),1);
    const step=(w-40)/Math.max(hist.length-1,1);
    const bottom=h-20,top=25,ch=bottom-top;
    ctx.strokeStyle="#38bdf8";ctx.beginPath();
    hist.forEach((p,i)=>{
      const x=20+i*step;
      const y=bottom-(p.valor/max)*ch;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
  function renderGraficos(){
    const anio=selAnio.value, mes=selMes.value;
    const presupuesto=calcularPresupuestoDesdeSubcats();
    const gastosMes=data.gastos.filter(g=>String(g.anio)===anio && String(g.mes)===mes).filter(filtroPorCartera);
    const total=gastosMes.reduce((a,g)=>a+g.montoARS,0);
    drawBarChart(chart1.getContext("2d"),["Presu","Gastado"],[presupuesto,total],"Comparativa del mes");
    const porCat={};gastosMes.forEach(g=>{porCat[g.cat]=(porCat[g.cat]||0)+g.montoARS;});
    drawPieChart(chart2.getContext("2d"),porCat,"Por categoría");
  }
  function initAfterDataChange(){
    initSelectors();
    renderCategoriasPanel();
    renderSelects();
    loadHeader();
    renderCarterasSelects();
    renderCarterasPanel();
    renderGastos();
    renderIngresos();
    renderPresupuestoPorSubcat();
    recalc();
    renderGraficos();
    renderInflacion();
    renderNotas();
    renderRecurrentes();
    renderUsdHist();
    renderTagsReport();
    renderDeudas();
    renderObjAnualEstado();
    setTimeout(liberarFechas,500);
  }
  initAfterDataChange();
  actualizarFechasHeader();
};


