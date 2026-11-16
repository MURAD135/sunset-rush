// Local backup controls. Restoring requires an explicit player confirmation and reload.
import {GuestProfile} from './guest-profile.js';
export function installSaveUI(store,{document,window}){
  const $=id=>document.getElementById(id);
  let guestStorage;try{guestStorage=window.localStorage;}catch{}
  const guest=new GuestProfile(guestStorage),guestCopy={ar:['ملف ضيف محلي على هذا الجهاز','اللعب المحلي دون حساب','تعذر حفظ ملف الضيف'],en:['Local guest profile on this device','Local play without an account','Guest profile could not be saved'],fr:['Profil invité local sur cet appareil','Jeu local sans compte','Profil invité non enregistré'],es:['Perfil de invitado local en este dispositivo','Juego local sin cuenta','No se pudo guardar el perfil invitado']};
  const showGuest=()=>{const text=guestCopy[document.documentElement.lang]||guestCopy.en;const exists=!!guest.load();$('guestStatus').textContent=text[exists?0:1];$('guestCreate').disabled=exists;};
  $('guestCreate').onclick=()=>{try{guest.create();showGuest();}catch{$('guestStatus').textContent=(guestCopy[document.documentElement.lang]||guestCopy.en)[2];}};showGuest();
  const messages={
    ar:{pending:'تغييرات بانتظار الحفظ',saved:'التقدم محفوظ على هذا الجهاز',recovered:'استُعيد التقدم من النسخة السابقة',unavailable:'تعذر الحفظ. صدّر نسخة احتياطية قبل إغلاق اللعبة.',blocked:'بيانات حفظ تالفة أو إصدار أحدث. لم تُستبدل البيانات الأصلية.',conflict:'تغير الحفظ في نافذة أخرى. صدّر تقدمك ثم أعد تحميل الصفحة.',invalid:'تعذر استعادة الملف. لم يُستبدل التقدم.',confirm:'استعادة هذه النسخة واستبدال التقدم الحالي؟ ستُحفظ النسخة الحالية للتراجع.',empty:'لا توجد نسخة سابقة صالحة.'},
    en:{pending:'Changes waiting to save',saved:'Progress saved on this device',recovered:'Recovered the previous save',unavailable:'Saving failed. Export a backup before closing.',blocked:'Damaged save or newer version. Original data was preserved.',conflict:'Another window changed this save. Export your progress, then reload.',invalid:'Could not restore this file. Progress was not replaced.',confirm:'Restore this backup and replace current progress? Current progress will be kept for rollback.',empty:'No valid previous backup.'},
    fr:{pending:'Sauvegarde en attente',saved:'Progression sauvegardée sur cet appareil',recovered:'Sauvegarde précédente récupérée',unavailable:'Échec de sauvegarde. Exportez avant de fermer.',blocked:'Sauvegarde endommagée ou plus récente. Original conservé.',conflict:'Sauvegarde modifiée dans une autre fenêtre. Exportez puis rechargez.',invalid:'Restauration impossible. Progression conservée.',confirm:'Restaurer cette copie ? La progression actuelle sera conservée pour annuler.',empty:'Aucune copie précédente valide.'},
    es:{pending:'Cambios pendientes de guardar',saved:'Progreso guardado en este dispositivo',recovered:'Guardado anterior recuperado',unavailable:'Error al guardar. Exporta antes de cerrar.',blocked:'Guardado dañado o versión más reciente. Original conservado.',conflict:'Otra ventana cambió el guardado. Exporta y recarga.',invalid:'No se pudo restaurar. Progreso conservado.',confirm:'¿Restaurar esta copia? Se conservará el progreso actual para deshacer.',empty:'No hay copia anterior válida.'}
  };
  let operationMessage=null;
  const message=key=>(messages[document.documentElement.lang]||messages.en)[key];
  const show=({status})=>{try{$('saveDamaged').hidden=!store.damagedBackup();}catch{$('saveDamaged').hidden=true;}$('saveStatus').textContent=message(operationMessage||status);$('saveNotice').textContent=message(status);$('saveNotice').hidden=!['unavailable','blocked','conflict'].includes(status);};
  const reportOperation=key=>{operationMessage=key;show(store);};
  store.onStatus=show;show(store);
  const recoveryConfirm={ar:'تعذر قراءة نسختَي الحفظ. استيراد النسخة المختارة؟ سنحتفظ بالبيانات المتضررة قبل استبدالها. إن تعذر حفظ الأرشيف فلن تتم الاستعادة.',en:'Both local saves are unreadable. Import this backup? Damaged data will be archived first; recovery stops if the archive cannot be saved.',fr:'Sauvegardes locales illisibles. Importer cette copie ? Les données endommagées seront archivées avant toute restauration.',es:'Guardados locales ilegibles. ¿Importar esta copia? Se archivarán los datos dañados antes de restaurar.'};
  const restore=async text=>{reportOperation(null);const recovery=store.canRecoverDamage;if(!window.confirm(recovery?(recoveryConfirm[document.documentElement.lang]||recoveryConfirm.en):message('confirm')))return;try{await (recovery?store.recoverDamage(text):store.restore(text));window.location.reload();}catch{reportOperation('invalid');}};
  $('saveExport').onclick=()=>{reportOperation(null);
    const blob=new Blob([store.export()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='sunset-rush-backup.json';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  $('saveDamaged').onclick=()=>{reportOperation(null);try{const raw=store.damagedBackup();if(!raw)return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='sunset-rush-damaged-data.json';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{reportOperation('invalid');}};
  $('saveImport').onclick=()=>$('saveFile').click();
  $('saveFile').onchange=async()=>{const file=$('saveFile').files?.[0];if(file){reportOperation(null);if(file.size>4_000_000){reportOperation('invalid');}else{try{await restore(await file.text());}catch{reportOperation('invalid');}}}$('saveFile').value='';};
  $('savePrevious').onclick=()=>{try{const text=store.backup();if(text)restore(text);else reportOperation('empty');}catch{reportOperation('empty');}};
  $('mSet').addEventListener('click',()=>{show(store);showGuest();});
}
