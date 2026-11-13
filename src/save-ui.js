// Local backup controls. Restoring requires an explicit player confirmation and reload.
export function installSaveUI(store,{document,window}){
  const $=id=>document.getElementById(id);
  const messages={
    ar:{pending:'تغييرات بانتظار الحفظ',saved:'التقدم محفوظ على هذا الجهاز',recovered:'استُعيد التقدم من النسخة السابقة',unavailable:'تعذر الحفظ. صدّر نسخة احتياطية قبل إغلاق اللعبة.',blocked:'بيانات حفظ تالفة أو إصدار أحدث. لم تُستبدل البيانات الأصلية.',conflict:'تغير الحفظ في نافذة أخرى. صدّر تقدمك ثم أعد تحميل الصفحة.',invalid:'تعذر استعادة الملف. لم يُستبدل التقدم.',confirm:'استعادة هذه النسخة واستبدال التقدم الحالي؟ ستُحفظ النسخة الحالية للتراجع.',empty:'لا توجد نسخة سابقة صالحة.'},
    en:{pending:'Changes waiting to save',saved:'Progress saved on this device',recovered:'Recovered the previous save',unavailable:'Saving failed. Export a backup before closing.',blocked:'Damaged save or newer version. Original data was preserved.',conflict:'Another window changed this save. Export your progress, then reload.',invalid:'Could not restore this file. Progress was not replaced.',confirm:'Restore this backup and replace current progress? Current progress will be kept for rollback.',empty:'No valid previous backup.'},
    fr:{pending:'Sauvegarde en attente',saved:'Progression sauvegardée sur cet appareil',recovered:'Sauvegarde précédente récupérée',unavailable:'Échec de sauvegarde. Exportez avant de fermer.',blocked:'Sauvegarde endommagée ou plus récente. Original conservé.',conflict:'Sauvegarde modifiée dans une autre fenêtre. Exportez puis rechargez.',invalid:'Restauration impossible. Progression conservée.',confirm:'Restaurer cette copie ? La progression actuelle sera conservée pour annuler.',empty:'Aucune copie précédente valide.'},
    es:{pending:'Cambios pendientes de guardar',saved:'Progreso guardado en este dispositivo',recovered:'Guardado anterior recuperado',unavailable:'Error al guardar. Exporta antes de cerrar.',blocked:'Guardado dañado o versión más reciente. Original conservado.',conflict:'Otra ventana cambió el guardado. Exporta y recarga.',invalid:'No se pudo restaurar. Progreso conservado.',confirm:'¿Restaurar esta copia? Se conservará el progreso actual para deshacer.',empty:'No hay copia anterior válida.'}
  };
  const message=key=>(messages[document.documentElement.lang]||messages.en)[key];
  const show=({status})=>{$('saveStatus').textContent=message(status);$('saveNotice').textContent=message(status);$('saveNotice').hidden=!['unavailable','blocked','conflict'].includes(status);};
  store.onStatus=show;show(store);
  const restore=async text=>{if(!window.confirm(message('confirm')))return;try{await store.restore(text);window.location.reload();}catch{$('saveStatus').textContent=message('invalid');}};
  $('saveExport').onclick=()=>{
    const blob=new Blob([store.export()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='sunset-rush-backup.json';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  $('saveImport').onclick=()=>$('saveFile').click();
  $('saveFile').onchange=async()=>{const file=$('saveFile').files?.[0];if(file){if(file.size>4_000_000){$('saveStatus').textContent=message('invalid');}else{try{await restore(await file.text());}catch{$('saveStatus').textContent=message('invalid');}}}$('saveFile').value='';};
  $('savePrevious').onclick=()=>{try{const text=store.backup();if(text)restore(text);else $('saveStatus').textContent=message('empty');}catch{$('saveStatus').textContent=message('empty');}};
  $('mSet').addEventListener('click',()=>show(store));
}
