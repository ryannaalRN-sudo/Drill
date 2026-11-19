/* =====================================================================
   Drill — base de connaissances de prescription
   Sources :
   - HAS, Prescription des antibiotiques en pratique bucco-dentaire
     (adoptée le 16/07/2026, publiée le 14/09/2026)                 [HAS 2026]
   - HAS, Prise en charge bucco-dentaire des patients à risque
     d'endocardite infectieuse (2024)                                [HAS 2024]
   - SFCO, Gestion péri-opératoire des patients traités par
     antithrombotiques en chirurgie orale (2015)                     [SFCO 2015]
   - ANSM : AINS contre-indiqués à partir du 6e mois de grossesse    [ANSM]
   - RCP (base de données publique des médicaments / Vidal) :
     paracétamol, aciclovir (Zovirax), miconazole (Daktarin, Loramyc),
     amphotéricine B (Fungizone)                                     [RCP]
   Outil d'aide : ne remplace pas le jugement clinique.
   ===================================================================== */
(function(){
const R = {};

/* ---------- Affections et actes (question 1) ---------- */
R.MOTIFS = [
  {groupe:'Acte prévu', items:[
    {v:'avulsion', t:'Avulsion d’une dent sur arcade', d:'Dent temporaire ou permanente, racines, avec ou sans alvéolectomie', chir:true},
    {v:'avulsion_incluse', t:'Avulsion de dent incluse, ectopique ou en désinclusion', d:'Dont dent de sagesse incluse', chir:true},
    {v:'implant', t:'Pose d’implant(s)', d:'', chir:true},
    {v:'greffe_osseuse', t:'Greffe osseuse ou sinus lift', d:'Augmentation pré ou péri-implantaire', chir:true},
    {v:'chir_paro', t:'Chirurgie parodontale', d:'Lambeau, greffe gingivale, élongation coronaire, régénération', chir:true},
    {v:'detartrage', t:'Détartrage ou surfaçage', d:''},
    {v:'endo', t:'Traitement endodontique', d:'Dent non vivante ou retraitement'},
    {v:'chir_periapicale', t:'Chirurgie endodontique (périapicale)', d:'', chir:true},
    {v:'biopsie', t:'Biopsie, frénectomie ou exérèse de lésion', d:'Tissus mous ou os', chir:true},
    {v:'soins', t:'Soins sans atteinte pulpaire, prothèse, radio', d:'Actes non invasifs'},
  ]},
  {groupe:'Infection ou douleur dentaire', items:[
    {v:'pulpite', t:'Pulpite (douleur pulpaire)', d:'Pulpe vivante'},
    {v:'abces', t:'Parodontite apicale aiguë, abcès apical, flambée', d:'Dent nécrosée ou infectée'},
    {v:'abces_paro', t:'Abcès parodontal ou endo-parodontal', d:''},
    {v:'pericoronarite', t:'Péricoronarite', d:'Dent de sagesse en éruption'},
    {v:'alveolite_seche', t:'Alvéolite sèche', d:'Alvéole vide, douleur intense, pas de pus'},
    {v:'alveolite_suppuree', t:'Alvéolite suppurée', d:'Pus dans l’alvéole'},
    {v:'cellulite', t:'Cellulite d’origine dentaire', d:'Tuméfaction des tissus mous, séreuse ou collectée'},
    {v:'sinusite', t:'Sinusite maxillaire d’origine dentaire', d:''},
    {v:'osteite', t:'Ostéite', d:''},
    {v:'mpn', t:'Gingivite ou parodontite nécrosante', d:'GUN, PUN'},
    {v:'periimplantite', t:'Péri-implantite', d:''},
    {v:'sialadenite', t:'Sialadénite bactérienne', d:'Infection d’une glande salivaire'},
    {v:'cbs', t:'Communication bucco-sinusienne per-opératoire', d:'Ou accident à l’hypochlorite, emphysème'},
  ]},
  {groupe:'Muqueuse buccale', items:[
    {v:'candidose', t:'Candidose (muguet, perlèche, stomatite)', d:''},
    {v:'herpes_primo', t:'Gingivostomatite herpétique', d:'Primo-infection, surtout chez l’enfant'},
    {v:'herpes_recurrent', t:'Herpès labial récurrent', d:'Bouton de fièvre'},
    {v:'aphte', t:'Aphte(s)', d:''},
    {v:'lesion_persistante', t:'Lésion qui ne guérit pas', d:'Ulcération, plaque blanche ou rouge depuis plus de 3 semaines'},
  ]},
  {groupe:'Traumatisme', items:[
    {v:'trauma_expulsion', t:'Expulsion d’une dent permanente (réimplantation)', d:'', chir:true},
    {v:'trauma_luxation', t:'Luxation, intrusion ou extrusion', d:'Avec ou sans fracture alvéolaire', chir:true},
    {v:'trauma_fracture', t:'Fracture coronaire ou radiculaire', d:''},
    {v:'trauma_plaie', t:'Plaie des tissus mous', d:''},
    {v:'trauma_morsure', t:'Plaie très souillée ou morsure', d:'Morsure de mammifère'},
  ]},
];
R.MOTIF = {}; R.MOTIFS.forEach(g=>g.items.forEach(i=>R.MOTIF[i.v]={...i, groupe:g.groupe}));

/* Affections pour lesquelles on demande les signes d'extension */
R.AVEC_EXTENSION = ['abces','abces_paro','alveolite_suppuree','pericoronarite','mpn','periimplantite'];
R.EXTENSION = [
  {v:'suppuration', t:'Suppuration', d:'Extension locale'},
  {v:'tumefaction', t:'Tuméfaction ou trismus', d:'Extension régionale'},
  {v:'fievre', t:'Fièvre ou adénopathie', d:'Extension systémique'},
  {v:'geste_impossible', t:'Geste local impossible aujourd’hui', d:'Drainage, débridement ou avulsion non réalisables'},
  {v:'aucun', t:'Aucun de ces signes', d:''},
];
R.GRAVITE_CELLULITE = [
  {v:'dysphagie', t:'Dysphagie', d:''},
  {v:'dyspnee', t:'Difficultés respiratoires', d:'Surtout allongé'},
  {v:'extension', t:'Extension loco-régionale', d:'Plancher buccal, cou, région orbitaire'},
  {v:'crepitant', t:'Crépitant sous-cutané', d:''},
  {v:'observance', t:'Prise en charge à domicile difficile', d:'Observance douteuse'},
  {v:'aucun', t:'Aucun signe de gravité', d:''},
];
R.IMPLANT_FACTEURS = [
  {v:'plus3', t:'Plus de 3 implants', d:''},
  {v:'immediat', t:'Extraction-implantation immédiate', d:''},
  {v:'long', t:'Intervention de plus de 1 h 30', d:''},
  {v:'echec', t:'Antécédent d’échec d’ostéo-intégration ou os peu vascularisé', d:''},
  {v:'aucun', t:'Aucun de ces facteurs', d:''},
];

/* ---------- Allergies ---------- */
R.ALLERGIES = [
  {v:'peni', t:'Pénicillines (amoxicilline)', d:''},
  {v:'cephalo', t:'Céphalosporines', d:''},
  {v:'macrolides', t:'Macrolides', d:'Clarithromycine, azithromycine'},
  {v:'metro', t:'Métronidazole', d:''},
  {v:'ains', t:'AINS ou aspirine', d:'Dont asthme déclenché par l’aspirine'},
  {v:'paracetamol', t:'Paracétamol', d:''},
  {v:'chx', t:'Chlorhexidine', d:''},
  {v:'iode', t:'Povidone iodée (Bétadine)', d:''},
  {v:'latex', t:'Latex', d:''},
  {v:'al', t:'Anesthésiques locaux', d:''},
  {v:'aucune', t:'Aucune allergie connue', d:''},
];

/* ---------- Antécédents ---------- */
R.ATCD = [
  {groupe:'Cardiaque', items:[
    {v:'ei_haut', t:'Haut risque d’endocardite infectieuse', d:'Antécédent d’endocardite, prothèse valvulaire (y compris TAVI, clip), cardiopathie congénitale cyanogène complexe, assistance ventriculaire'},
    {v:'ei_inter', t:'Risque intermédiaire d’endocardite', d:'Valvulopathie native, cardiomyopathie hypertrophique obstructive, pacemaker ou défibrillateur'},
    {v:'insuf_card', t:'Insuffisance cardiaque', d:''},
    {v:'qt', t:'QT long ou médicament allongeant le QT', d:''},
  ]},
  {groupe:'Risque infectieux augmenté (HAS 2026)', items:[
    {v:'chimio', t:'Chimiothérapie aplasiante ou neutropénie < 500/mm³', d:''},
    {v:'immunosup', t:'Immunosuppresseur, immunomodulateur ou biothérapie', d:'Risque à évaluer selon la molécule'},
    {v:'cortico', t:'Corticoïdes ≥ 10 mg/j d’équivalent prednisolone depuis plus de 2 semaines', d:''},
    {v:'greffe', t:'Greffe d’organe ou de cellules souches (anti-rejet)', d:''},
    {v:'vih', t:'VIH avec CD4 < 200/mm³', d:''},
    {v:'deficit', t:'Déficit immunitaire congénital ou du complément', d:''},
    {v:'asplenie', t:'Asplénie depuis moins de 5 ans', d:''},
    {v:'diabete', t:'Diabète avec HbA1c ≥ 9 %', d:'HbA1c de moins de 3 mois'},
    {v:'ir_severe', t:'Insuffisance rénale sévère (DFG < 30) ou dialyse', d:''},
    {v:'ih_severe', t:'Insuffisance hépatique sévère (TP ≤ 50 %)', d:''},
    {v:'drepano', t:'Syndrome drépanocytaire majeur', d:'Risque à évaluer avec le médecin référent'},
  ]},
  {groupe:'Risque d’ostéonécrose des mâchoires (HAS 2026)', items:[
    {v:'radio40', t:'Radiothérapie cervico-faciale ≥ 40 Gy sur les mâchoires', d:''},
    {v:'denosumab', t:'Dénosumab (Prolia, Xgeva) : dernière injection < 6 mois', d:''},
    {v:'bp_malin', t:'Bisphosphonates ou anti-angiogéniques pour un cancer', d:''},
    {v:'bp_benin5', t:'Bisphosphonates pour ostéoporose ou Paget, 5 ans cumulés ou plus', d:''},
    {v:'bp_benin', t:'Bisphosphonates pour ostéoporose, moins de 5 ans', d:'Pas haut risque selon la HAS'},
  ]},
  {groupe:'Autres', items:[
    {v:'ir_moderee', t:'Insuffisance rénale modérée', d:''},
    {v:'ih', t:'Insuffisance hépatique, alcoolisme chronique', d:''},
    {v:'ulcere', t:'Ulcère ou antécédent d’hémorragie digestive', d:''},
    {v:'asthme', t:'Asthme', d:''},
    {v:'cancer_tete_cou', t:'Cancer en cours ou antécédent de cancer des VADS', d:''},
    {v:'aucun', t:'Aucun antécédent notable', d:''},
  ]},
];
R.RIA = ['chimio','immunosup','cortico','greffe','vih','deficit','asplenie','diabete','ir_severe','ih_severe','drepano'];
R.HRON = ['radio40','denosumab','bp_malin','bp_benin5'];

/* ---------- Traitements ---------- */
R.TTT = [
  {v:'aap', t:'Un antiplaquettaire', d:'Kardégic, aspirine, Plavix (clopidogrel), Brilique, Efient'},
  {v:'aap2', t:'Deux antiplaquettaires (bithérapie)', d:'Par exemple aspirine + clopidogrel'},
  {v:'avk', t:'Antivitamine K', d:'Coumadine (warfarine), Préviscan (fluindione), Sintrom'},
  {v:'aod', t:'Anticoagulant oral direct', d:'Eliquis (apixaban), Xarelto (rivaroxaban), Pradaxa, Lixiana'},
  {v:'heparine', t:'Héparine', d:'Lovenox, Innohep, Fragmine, héparine non fractionnée'},
  {v:'sulfamide', t:'Sulfamide hypoglycémiant', d:'Gliclazide, glimépiride…'},
  {v:'mtx', t:'Méthotrexate', d:''},
  {v:'aucun', t:'Aucun de ces traitements', d:''},
];
R.RISQUE_HEMO = [
  {v:'faible', t:'Risque hémorragique faible', d:'Avulsions sur un secteur, dents de sagesse, implant(s) sur un secteur, biopsie, kyste < 4 cm'},
  {v:'eleve', t:'Risque hémorragique élevé', d:'Avulsions de toute une arcade, implants sur plusieurs secteurs, greffe osseuse avec prélèvement, sinus lift, greffe gingivale palatine, kyste > 4 cm'},
];

/* ---------- Outils de dose ---------- */
const arr = x => Math.round(x/10)*10;
function dose(kg, mgkg, max){ return Math.min(arr(kg*mgkg), max); }
function parPrise(kg, mgkgj, maxj, prises){ return Math.min(arr(kg*mgkgj/prises), Math.floor(maxj/prises)); }
const fmtMg = mg => mg>=1000 && mg%1000===0 ? (mg/1000)+' g' : mg+' mg';

/* ---------- Le moteur ---------- */
R.decider = function(rep){
  const m = rep.motif, M = R.MOTIF[m] || {};
  const p = rep.profil||'adulte', enfant = p==='enfant', kg = Number(rep.poids)||0, age = Number(rep.age);
  const al = new Set(rep.allergies||[]), at = new Set(rep.atcd||[]), tt = new Set(rep.ttt||[]), ext = new Set(rep.extension||[]);
  const ria = R.RIA.some(x=>at.has(x)), hron = R.HRON.some(x=>at.has(x)), eiHaut = at.has('ei_haut');
  const malin = at.has('bp_malin') || at.has('radio40') || at.has('cancer_tete_cou');
  const enceinte = p==='enceinte', terme6 = enceinte && rep.terme==='apres';
  const O = {gestes:[], pourquoi:[], alertes:[], lignes:[], hospit:false, atb:false};
  const src = s => ` <span class="src">${s}</span>`;
  const why = (t,s) => O.pourquoi.push(t + (s?src(s):''));
  const alerte = (n,t,d,s) => O.alertes.push({n,t,d:d+(s?src(s):'')});
  const ligne = (id,cat,med,pos,qsp,note) => O.lignes.push({id,cat,med,pos,qsp,note});
  const enfantKg = enfant && kg>0;
  const moins6 = enfant && age>0 && age<6;
  const forme = moins6 ? ' (forme buvable : pas de comprimé ni de gélule avant 6 ans)' : '';
  const sousAOD = tt.has('aod'), qt = at.has('qt');

  /* --- Choix d'une alternative orale aux pénicillines --- */
  function altProphy(){
    // HAS 2026 : clarithromycine > azithromycine > pristinamycine ; HAS 2024 (EI) : azithromycine ou pristinamycine
    const opts = [];
    if(!eiHaut && !al.has('macrolides') && !qt && !sousAOD) opts.push(['Clarithromycine', enfantKg?fmtMg(dose(kg,15,500)):'500 mg', enfantKg?'15 mg/kg, sans dépasser 500 mg':'']);
    if(!al.has('macrolides') && !qt) opts.push(['Azithromycine', enfantKg?fmtMg(dose(kg,20,500)):'500 mg', enfantKg?'20 mg/kg, sans dépasser 500 mg':'']);
    if(!(enfant && age>0 && age<6)) opts.push(['Pristinamycine', enfantKg?fmtMg(dose(kg,25,1000)):'1 g', enfantKg?'25 mg/kg, sans dépasser 1 g':'']);
    return opts[0];
  }

  /* --- Antibioprophylaxie --- */
  function prophylaxie(raison, hronOs){
    O.atb = true;
    const peni = al.has('peni');
    if(hronOs){
      if(!peni){
        ligne('abp','Antibioprophylaxie et relais','Amoxicilline'+forme, enfantKg ? `${fmtMg(dose(kg,50,2000))} 1 h avant l’intervention (50 mg/kg), puis ${fmtMg(parPrise(kg,50,1500,3))} 3 fois par jour (50 mg/kg/j, max 1,5 g/j)` : '2 g 1 h avant l’intervention, puis 500 mg 3 fois par jour','7 jours');
      } else {
        const a = altProphy();
        if(a && a[0]==='Azithromycine') ligne('abp','Antibioprophylaxie et relais','Azithromycine', enfantKg?`${a[1]} 1 h avant, puis ${a[1]} 1 fois par jour`:'500 mg 1 h avant, puis 500 mg 1 fois par jour','2 jours');
        else if(a && a[0]==='Clarithromycine') ligne('abp','Antibioprophylaxie et relais','Clarithromycine', enfantKg?`${a[1]} 1 h avant, puis ${fmtMg(parPrise(kg,15,1000,2))} 2 fois par jour`:'500 mg 1 h avant, puis 500 mg 2 fois par jour','7 jours');
        else ligne('abp','Antibioprophylaxie et relais','Pristinamycine', enfantKg?`${fmtMg(dose(kg,25,1000))} 1 h avant, puis ${fmtMg(parPrise(kg,50,2000,3))} 3 fois par jour`:'1 g 1 h avant, puis 1 g 2 fois par jour','7 jours');
      }
      why(raison+' Chez un patient à haut risque d’ostéonécrose, un acte exposant l’os justifie une antibioprophylaxie suivie d’un relais de 7 jours.','HAS 2026');
      return;
    }
    if(!peni){
      ligne('abp','Antibioprophylaxie','Amoxicilline'+forme, enfantKg?`${fmtMg(dose(kg,50,2000))} en une prise, 30 à 60 min avant l’acte (50 mg/kg, max 2 g)`:'2 g en une prise, 30 à 60 min avant l’acte','Dose unique');
    } else {
      const a = altProphy();
      if(a) ligne('abp','Antibioprophylaxie',a[0], `${a[1]} en une prise, 30 à 60 min avant l’acte${a[2]?' ('+a[2]+')':''}`,'Dose unique');
      else alerte('forte','Pas d’alternative orale adaptée','Allergies ou contre-indications multiples : avis spécialisé (céfazoline IV possible en milieu adapté).');
      if(qt && !al.has('macrolides')) alerte('moy','Macrolides écartés','QT long : azithromycine et clarithromycine à éviter.','HAS 2024');
      if(sousAOD) alerte('moy','Clarithromycine écartée','À éviter chez un patient sous AOD.','SFCO 2015');
    }
    why(raison, eiHaut?'HAS 2024':'HAS 2026');
    O.alertes.push({n:'info',t:'Oubli ou urgence',d:'L’antibioprophylaxie peut encore être prise jusqu’à 2 h après le geste.'+src('HAS 2026')});
    if(eiHaut) O.alertes.push({n:'info',t:'Délivrance à l’unité',d:'Préciser sur l’ordonnance une délivrance à l’unité. Espacer d’au moins 3 semaines les séances nécessitant une antibioprophylaxie, sinon changer de classe d’antibiotique.'+src('HAS 2024')});
  }

  /* --- Antibiothérapie curative --- */
  function curatifAmox(raison){
    O.atb = true;
    const peni = al.has('peni');
    if(!peni){
      ligne('abc','Antibiotique','Amoxicilline'+forme, enfantKg?`${fmtMg(parPrise(kg,50,3000,3))} 3 fois par jour (50 mg/kg/j, max 3 g/j)`:'1 g 3 fois par jour','3 jours');
    } else if(!al.has('macrolides') && !qt && !sousAOD && !al.has('metro')){
      ligne('abc','Antibiotique','Clarithromycine (hors AMM)', enfantKg?`${fmtMg(parPrise(kg,15,1000,2))} 2 fois par jour (15 mg/kg/j)`:'500 mg 2 fois par jour','3 jours');
      ligne('abc2','Antibiotique','Métronidazole', enfantKg?`${fmtMg(parPrise(kg,30,1500,3))} 3 fois par jour (30 mg/kg/j)`:'500 mg 3 fois par jour','3 jours');
    } else if(!al.has('macrolides') && !qt){
      ligne('abc','Antibiotique','Azithromycine', enfantKg?`${fmtMg(dose(kg,20,500))} 1 fois par jour (20 mg/kg/j)`:'500 mg 1 fois par jour','3 jours');
      if(sousAOD) alerte('moy','Clarithromycine écartée','Patient sous AOD : clarithromycine à éviter, azithromycine proposée.','SFCO 2015');
    } else {
      ligne('abc','Antibiotique','Pristinamycine (hors AMM)', enfantKg?`${fmtMg(parPrise(kg,50,2000,3))} 3 fois par jour (50 mg/kg/j)`:'1 g 2 fois par jour','3 jours');
    }
    why(raison+' Amoxicilline en 1re intention, 3 jours, à prolonger de 2 jours si les symptômes persistent. Réévaluer à 48-72 h.','HAS 2026');
  }
  function curatifMetro(raison, cellulite){
    O.atb = true;
    if(enfant){
      if(!al.has('peni')) ligne('abc','Antibiotique','Amoxicilline'+forme, kg?`${fmtMg(parPrise(kg, cellulite?90:50, 3000, 3))} 3 fois par jour (${cellulite?'80 à 100':'50'} mg/kg/j, max 3 g/j)`:'Dose au poids : renseigner le poids','3 jours');
      else if(!al.has('metro')) ligne('abc','Antibiotique','Métronidazole'+forme, kg?`${fmtMg(parPrise(kg,30,1500,3))} 3 fois par jour (30 mg/kg/j, max 1,5 g/j)`:'Dose au poids : renseigner le poids','3 jours');
      why(raison+' Chez l’enfant, amoxicilline en 1re intention, métronidazole en alternative. Réévaluer à 48-72 h.','HAS 2026');
    } else {
      if(!al.has('metro')){
        ligne('abc','Antibiotique','Métronidazole','500 mg 3 fois par jour','3 jours');
        O.alertes.push({n:'moy',t:'Métronidazole et alcool',d:'Effet antabuse : pas d’alcool pendant le traitement ni dans les jours qui suivent.'+src('RCP')});
      } else alerte('forte','Allergie au métronidazole','La HAS ne propose pas d’alternative pour cette indication : avis spécialisé.','');
      why(raison+' Métronidazole 500 mg 3 fois par jour pendant 3 jours, prolongeable de 2 jours. Réévaluer à 48-72 h.','HAS 2026');
    }
  }

  /* --- 1. Décision selon l'acte ou l'affection --- */
  const extension = ['suppuration','tumefaction','fievre'].some(x=>ext.has(x));
  const gesteImpossible = ext.has('geste_impossible');
  const condRisque = eiHaut || ria;

  switch(m){
    case 'avulsion':
      O.gestes.push('Avulsion avec hémostase locale soigneuse.');
      if(eiHaut) prophylaxie('Patient à haut risque d’endocardite : l’avulsion est autorisée avec antibioprophylaxie.');
      else if(hron) prophylaxie('Avulsion chez un patient à haut risque d’ostéonécrose : antibioprophylaxie recommandée.', true);
      else if(ria) prophylaxie('Patient à risque infectieux augmenté : antibioprophylaxie recommandée pour une avulsion.');
      else why('Pas d’antibiotique : en population générale, l’antibioprophylaxie n’est pas recommandée pour une avulsion sur arcade (grade A).','HAS 2026');
      break;
    case 'avulsion_incluse':
      O.gestes.push('Avulsion chirurgicale. Bain de bouche à la chlorhexidine en post-opératoire pour prévenir l’alvéolite.');
      if(hron) { prophylaxie('Haut risque d’ostéonécrose : antibioprophylaxie à discuter au cas par cas (bénéfice/risque).', true); }
      else prophylaxie(eiHaut ? 'Haut risque d’endocardite : antibioprophylaxie.' : 'Antibioprophylaxie recommandée pour l’avulsion d’une dent incluse, ectopique ou en désinclusion, y compris en population générale (grade A).');
      O.lignes.push({id:'bdb',cat:'Antiseptique',med:'Chlorhexidine 0,12 % bain de bouche',pos:'15 mL en bain de bouche de 30 s, 2 fois par jour, à commencer le lendemain',qsp:'7 jours'});
      break;
    case 'implant': {
      if(eiHaut){ O.gestes.push('Implant sans membrane de régénération : autorisé.'); prophylaxie('Haut risque d’endocardite : pose d’implant sans membrane autorisée avec antibioprophylaxie.'); break; }
      if(malin){ alerte('forte','Implant contre-indiqué','Contre-indiqué en contexte de pathologie maligne.','HAS 2026'); break; }
      const f = (rep.implant||[]).filter(x=>x!=='aucun');
      if(hron) prophylaxie('Haut risque d’ostéonécrose : antibioprophylaxie au cas par cas.', true);
      else if(ria) prophylaxie('Risque infectieux augmenté : antibioprophylaxie au cas par cas.');
      else if(f.length) prophylaxie('Antibioprophylaxie possible : la HAS la réserve aux poses complexes (plus de 3 implants, extraction-implantation immédiate, plus de 1 h 30, antécédent d’échec ou os peu vascularisé).');
      else why('Pas d’antibioprophylaxie systématique pour une pose d’implant en population générale (grade B).','HAS 2026');
      break; }
    case 'greffe_osseuse':
      if(eiHaut){ alerte('forte','Attention à la membrane','Toute chirurgie avec membrane de régénération osseuse est contre-indiquée chez le patient à haut risque d’endocardite.','HAS 2024'); }
      if(malin || at.has('radio40')){ alerte('forte','Greffe contre-indiquée','Contre-indiquée en cas de pathologie maligne ou d’irradiation ≥ 40 Gy.','HAS 2026'); break; }
      prophylaxie('Antibioprophylaxie recommandée pour une greffe osseuse ou un sinus lift, y compris en population générale.', hron);
      break;
    case 'chir_paro':
      if(eiHaut){ prophylaxie('Haut risque d’endocardite : chirurgie parodontale sans membrane autorisée avec antibioprophylaxie.'); alerte('forte','Pas de membrane','Chirurgie avec membrane contre-indiquée.','HAS 2024'); break; }
      if(hron) prophylaxie('Haut risque d’ostéonécrose : antibioprophylaxie au cas par cas.', true);
      else if(ria) prophylaxie('Risque infectieux augmenté : antibioprophylaxie au cas par cas.');
      else why('Pas d’antibioprophylaxie en population générale pour la chirurgie parodontale.','HAS 2026');
      break;
    case 'detartrage':
      if(eiHaut) prophylaxie('Haut risque d’endocardite : sondage, détartrage et surfaçage autorisés avec antibioprophylaxie.');
      else if(ria) prophylaxie('Risque infectieux augmenté : antibioprophylaxie au cas par cas pour le détartrage-surfaçage.');
      else why('Pas d’antibioprophylaxie pour un détartrage-surfaçage en population générale'+(hron?' ni chez le patient à haut risque d’ostéonécrose':'')+'.','HAS 2026');
      break;
    case 'endo':
      if(eiHaut) prophylaxie('Haut risque d’endocardite : traitement endodontique de l’adulte autorisé avec antibioprophylaxie. Attention, la pulpectomie de dent temporaire est contre-indiquée.');
      else if(ria) prophylaxie('Risque infectieux augmenté : antibioprophylaxie recommandée pour un traitement endodontique de dent non vivante ou un retraitement.');
      else why('Pas d’antibioprophylaxie en population générale (grade B)'+(hron?' ni chez le patient à haut risque d’ostéonécrose':'')+'.','HAS 2026');
      break;
    case 'chir_periapicale':
      if(malin || at.has('radio40')){ alerte('forte','Contre-indiquée','Chirurgie périapicale contre-indiquée en cas de pathologie maligne ou d’irradiation ≥ 40 Gy.','HAS 2026'); break; }
      if(hron) prophylaxie('Haut risque d’ostéonécrose : antibioprophylaxie au cas par cas.', true);
      else if(ria || eiHaut) prophylaxie('Patient à risque : antibioprophylaxie recommandée pour la chirurgie périapicale.');
      else why('Pas d’antibioprophylaxie en population générale (grade B).','HAS 2026');
      break;
    case 'biopsie':
      if(hron) prophylaxie('Haut risque d’ostéonécrose : antibioprophylaxie si la lésion est osseuse.', true);
      else if(ria || eiHaut) prophylaxie('Patient à risque : antibioprophylaxie recommandée.');
      else why('Pas d’antibioprophylaxie en population générale.','HAS 2026');
      break;
    case 'soins':
      why('Acte non invasif : aucun antibiotique (soins sans atteinte pulpaire, prothèse, empreinte, radio, anesthésie para-apicale).','HAS 2026');
      break;
    case 'pulpite':
      O.gestes.push('Geste d’urgence : pulpotomie ou pulpectomie. C’est le geste qui soulage, pas l’antibiotique.');
      why('Pas d’antibiotique : la douleur pulpaire est inflammatoire. Elle se traite par un geste rapide et des antalgiques.','HAS 2026');
      break;
    case 'abces': case 'abces_paro': case 'alveolite_suppuree': case 'periimplantite': {
      const noms = {abces:'parodontite apicale aiguë ou abcès', abces_paro:'abcès parodontal', alveolite_suppuree:'alvéolite suppurée', periimplantite:'péri-implantite'};
      if(m==='periimplantite' && eiHaut){ alerte('forte','Traitement contre-indiqué','Tout traitement de la péri-implantite est contre-indiqué chez le patient à haut risque d’endocardite : orienter.','HAS 2024'); break; }
      O.gestes.push({abces:'Drainage : trépanation et pulpectomie, incision ou avulsion selon la dent.', abces_paro:'Drainage et débridement (détartrage-surfaçage de la poche) ou avulsion.', alveolite_suppuree:'Irrigation et curetage doux de l’alvéole.', periimplantite:'Débridement mécanique et décontamination de la surface implantaire.'}[m]);
      const raisons=[]; if(eiHaut) raisons.push('haut risque d’endocardite'); if(ria) raisons.push('risque infectieux augmenté'); if(extension) raisons.push('signes d’extension'); if(gesteImpossible) raisons.push('geste local impossible');
      if(raisons.length) curatifAmox(`Antibiotique indiqué pour cette ${noms[m]} (${raisons.join(', ')}), en complément du geste local.`);
      else why(`Pas d’antibiotique : en l’absence de signe d’extension, de terrain à risque et si le geste local est réalisé, la ${noms[m]} se traite par le geste local.`+(m==='alveolite_suppuree'?' La suppuration seule ne suffit pas à justifier un antibiotique.':''),'HAS 2026');
      break; }
    case 'pericoronarite':
      O.gestes.push('Irrigation sous le capuchon, nettoyage. Avulsion de la dent ou du capuchon à discuter à froid.');
      if(extension || gesteImpossible) curatifMetro('Infection péricoronaire avec signe d’extension : antibiotique recommandé.');
      else if(condRisque) curatifAmox('Patient à risque : antibiotique en complément du geste local.');
      else why('Pas d’antibiotique pour une péricoronarite sans signe d’extension (grade C).','HAS 2026');
      break;
    case 'alveolite_seche':
      O.gestes.push('Irrigation douce au sérum, retrait des débris, pansement intra-alvéolaire antalgique.');
      why('Pas d’antibiotique pour une alvéolite sèche : le traitement est local et antalgique (grade C).','HAS 2026');
      break;
    case 'cellulite': {
      const grav = (rep.gravite||[]).filter(x=>x!=='aucun');
      if(grav.length){ O.hospit=true; alerte('forte','Adresser à l’hôpital','Signe de gravité ou prise en charge ambulatoire difficile : prise en charge hospitalière, avec antibiothérapie IV possible.','HAS 2026'); }
      O.gestes.push('Traiter la cause dentaire (drainage endodontique, incision si collection, avulsion) : l’antibiotique ne remplace pas le geste.');
      curatifMetro('Une cellulite, séreuse ou collectée, comporte par définition une tuméfaction : c’est un signe d’extension régionale qui justifie l’antibiotique.', true);
      break; }
    case 'sinusite':
      O.atb = true;
      O.gestes.push('Traiter la dent causale. Avis ORL si besoin.');
      if(!al.has('peni')) ligne('abc','Antibiotique','Amoxicilline + acide clavulanique'+forme, enfantKg?`${fmtMg(parPrise(kg,80,3000,3))} (équivalent amoxicilline) 3 fois par jour (80 mg/kg/j, max 3 g/j)`:'1 g / 125 mg 3 fois par jour', enfant?'10 jours':'7 jours');
      else if(!al.has('cephalo')) ligne('abc','Antibiotique','Cefpodoxime proxétil', enfantKg?`${fmtMg(parPrise(kg,8,400,2))} 2 fois par jour (8 mg/kg/j)`:'200 mg 2 fois par jour', enfant?'10 jours':'5 jours');
      else if(!enfant) ligne('abc','Antibiotique','Pristinamycine','1 g 2 fois par jour','4 jours');
      else alerte('forte','Allergie aux bêta-lactamines','Avis ORL spécialisé.','HAS 2026');
      why('Sinusite maxillaire aiguë d’origine dentaire : bithérapie amoxicilline-acide clavulanique, l’une des rares indications de première intention.','HAS 2026');
      break;
    case 'osteite':
      O.atb = true; O.gestes.push('Prélèvement osseux pour culture avant l’antibiotique, puis traitement chirurgical. Orienter vers un service spécialisé.');
      if(!al.has('peni')) ligne('abc','Antibiotique','Amoxicilline + acide clavulanique', enfantKg?`${fmtMg(parPrise(kg,80,3000,3))} 3 fois par jour`:'1 g / 125 mg 3 fois par jour','14 jours minimum, jusqu’à disparition des signes locaux');
      else { ligne('abc','Antibiotique','Clarithromycine', enfantKg?`${fmtMg(parPrise(kg,15,1000,2))} 2 fois par jour`:'500 mg 2 fois par jour','14 jours minimum'); ligne('abc2','Antibiotique','Métronidazole', enfantKg?`${fmtMg(parPrise(kg,30,1500,3))} 3 fois par jour`:'500 mg 3 fois par jour','14 jours minimum'); }
      why('Ostéite : antibiothérapie d’au moins 14 jours, après prélèvement osseux.','HAS 2026');
      break;
    case 'mpn':
      O.gestes.push('Débridement doux des lésions nécrotiques, hygiène orale, bain de bouche antiseptique.');
      if(ext.has('fievre')) curatifMetro('Maladie parodontale nécrosante avec atteinte systémique (fièvre, adénopathie) : antibiotique recommandé.');
      else if(condRisque || gesteImpossible) curatifAmox('Maladie parodontale nécrosante chez un patient à risque ou sans geste local possible.');
      else why('Pas d’antibiotique sans atteinte systémique (grade C).','HAS 2026');
      break;
    case 'sialadenite':
      O.gestes.push('Hydratation, massages glandulaires, sialogogues. Avis spécialisé si collection.');
      curatifMetro('Sialadénite bactérienne : antibiotique recommandé.');
      break;
    case 'cbs':
      O.atb = true; O.gestes.push('Fermeture de la communication si indiquée. Consignes : ne pas se moucher fort, ne pas éternuer bouche fermée.');
      if(!al.has('peni')) ligne('abc','Antibiotique','Amoxicilline'+forme, enfantKg?`${fmtMg(parPrise(kg,50,2000,3))} 3 fois par jour (50 mg/kg/j, max 2 g/j)`:'1 g 2 fois par jour','5 jours');
      else if(!al.has('macrolides') && !qt) ligne('abc','Antibiotique','Azithromycine', enfantKg?`${fmtMg(dose(kg,20,500))} 1 fois par jour`:'500 mg 1 fois par jour','3 jours');
      else ligne('abc','Antibiotique','Pristinamycine', enfantKg?`${fmtMg(parPrise(kg,50,2000,3))} 3 fois par jour`:'1 g 2 fois par jour','5 jours');
      why('Événement indésirable per-opératoire (communication bucco-sinusienne, accident à l’hypochlorite, emphysème) : antibiotique post-opératoire recommandé.','HAS 2026');
      break;
    case 'trauma_expulsion':
      if(hron){ alerte('forte','Réimplantation contre-indiquée','Contre-indiquée chez le patient à haut risque d’ostéonécrose.','HAS 2026'); break; }
      O.gestes.push('Réimplantation au plus vite, contention souple. Vérifier la vaccination antitétanique.');
      if(ria || eiHaut) prophylaxie('Patient à risque : antibioprophylaxie recommandée pour la réimplantation.');
      else why('Pas d’antibiotique en population générale pour la réimplantation (grade C).','HAS 2026');
      break;
    case 'trauma_luxation':
      O.gestes.push('Repositionnement et contention.');
      if(ria || eiHaut) prophylaxie('Patient à risque : antibioprophylaxie recommandée.');
      else if(hron) prophylaxie('Haut risque d’ostéonécrose : antibioprophylaxie recommandée.', true);
      else why('Pas d’antibiotique en population générale.','HAS 2026');
      break;
    case 'trauma_fracture':
      O.gestes.push('Protection dentinaire ou pulpaire, restauration ou recollage du fragment.');
      why('Pas d’antibiotique pour une fracture dentaire.','HAS 2026');
      break;
    case 'trauma_plaie':
      O.gestes.push('Nettoyage, suture si nécessaire. Vérifier la vaccination antitétanique.');
      why('Pas d’antibiotique pour une plaie des tissus mous non souillée.','HAS 2026');
      break;
    case 'trauma_morsure':
      O.atb = true; O.gestes.push('Lavage abondant, parage. Vérifier la vaccination antitétanique.');
      if(!al.has('peni')) ligne('abc','Antibiotique','Amoxicilline + acide clavulanique'+forme, enfantKg?`${fmtMg(parPrise(kg,80,3000,3))} 3 fois par jour (80 mg/kg/j)`:'1 g / 125 mg 3 fois par jour','5 jours');
      else if(!enfant || age>=6) ligne('abc','Antibiotique','Pristinamycine', enfantKg?`${fmtMg(parPrise(kg,50,3000,3))} 3 fois par jour`:'1 g 3 fois par jour','5 jours');
      why('Plaie très souillée ou morsure de mammifère : antibiotique recommandé (bithérapie amoxicilline-acide clavulanique).','HAS 2026');
      break;
    case 'candidose': {
      O.gestes.push('Rechercher la cause : prothèse (nettoyage, retrait la nuit), corticoïdes inhalés (rinçage après usage), immunodépression, diabète, xérostomie.');
      const miconazoleCI = tt.has('avk') || tt.has('sulfamide');
      if(miconazoleCI){
        alerte('forte','Miconazole contre-indiqué','Contre-indiqué avec les antivitamines K (hémorragies graves) et les sulfamides hypoglycémiants, y compris en gel buccal.','RCP');
        ligne('afg','Antifongique','Amphotéricine B 10 % suspension buvable (Fungizone)', enfant ? (kg>30?'15 mL par jour, en bain de bouche puis avalé':(kg?`${Math.round(kg/2)} mL par jour (1 mL pour 2 kg), en 2 prises`:'1 mL pour 2 kg et par jour')) : '15 à 20 mL par jour, en 2 à 3 prises, en bain de bouche puis avalé','2 à 3 semaines');
      } else if(ria && !enfant){
        ligne('afg','Antifongique','Miconazole 50 mg comprimé gingival muco-adhésif (Loramyc)','1 comprimé par jour appliqué sur la gencive','7 à 14 jours');
        why('Patient immunodéprimé : le comprimé muco-adhésif de miconazole est indiqué.','RCP');
      } else {
        ligne('afg','Antifongique','Miconazole 2 % gel buccal (Daktarin)', enfant && age>0 && age<2 ? '1,25 mL 4 fois par jour, à distance des repas (à partir de 4 mois)' : '2,5 mL 4 fois par jour, à distance des repas, garder en bouche avant d’avaler','7 à 15 jours');
      }
      why('Candidose buccale : traitement antifongique local. Ce n’est pas une infection bactérienne : pas d’antibiotique. Forme étendue ou immunodépression sévère : avis médical (traitement par voie générale).','RCP');
      break; }
    case 'herpes_primo':
      O.gestes.push('Hydratation, alimentation froide et molle, antalgiques. Hospitalisation si l’enfant ne boit plus.');
      ligne('av','Antiviral','Aciclovir suspension buvable 200 mg/5 mL', enfant && age>0 && age<2 ? '100 mg (2,5 mL) 5 fois par jour, environ toutes les 4 h' : '200 mg (5 mL) 5 fois par jour, environ toutes les 4 h','5 jours');
      why('Primo-infection herpétique : aciclovir le plus tôt possible après le début des symptômes. Pas d’antibiotique.','RCP');
      break;
    case 'herpes_recurrent':
      O.gestes.push('Soins locaux, éviter de toucher les lésions. Reporter les soins non urgents tant que les lésions sont actives (contagion).');
      why('Herpès labial récurrent : l’intérêt des antiviraux est limité, traitement symptomatique. Pas d’antibiotique.','');
      break;
    case 'aphte':
      O.gestes.push('Traitement symptomatique local, éviter les aliments irritants. Bilan si aphtes très fréquents ou géants.');
      why('Pas d’antibiotique pour des aphtes.','');
      break;
    case 'lesion_persistante':
      alerte('forte','Orienter rapidement','Toute lésion qui ne guérit pas en 3 semaines doit être explorée (biopsie ou avis spécialisé) pour éliminer une lésion maligne.','');
      why('Pas de prescription d’attente : l’urgence est le diagnostic.','');
      break;
  }

  /* --- 2. Antalgiques --- */
  const douleur = !['soins','lesion_persistante','candidose','detartrage'].includes(m);
  if(douleur && !al.has('paracetamol')){
    let pos, qsp='5 jours';
    if(enfant) pos = kg ? `${arr(kg*15)} mg toutes les 6 h si douleur (15 mg/kg, max 60 mg/kg/j)` : '15 mg/kg toutes les 6 h si douleur (renseigner le poids)';
    else if(at.has('ih') || at.has('ih_severe')) pos = '500 mg à 1 g par prise, au moins 8 h entre deux prises, sans dépasser 2 g par jour';
    else if(at.has('ir_severe')) pos = '1 g par prise, au moins 6 à 8 h entre deux prises, sans dépasser 2 à 3 g par jour selon la clairance';
    else pos = '1 g par prise si douleur, au moins 6 h entre deux prises, sans dépasser 3 g par jour';
    ligne('para','Antalgique','Paracétamol'+(enfant&&age>0&&age<6?' (forme buvable)':''), pos, qsp);
  }
  // AINS
  const ainsRaisons = [];
  if(terme6) ainsRaisons.push('grossesse à partir du 6e mois (contre-indication absolue)');
  else if(enceinte) ainsRaisons.push('grossesse (à éviter avant le 6e mois, contre-indiqués ensuite)');
  if(al.has('ains')) ainsRaisons.push('allergie aux AINS ou à l’aspirine');
  if(tt.has('avk')) ainsRaisons.push('antivitamine K (contre-indiqués)');
  if(tt.has('aod') || tt.has('aap') || tt.has('aap2') || tt.has('heparine')) ainsRaisons.push('traitement antithrombotique (majoration du risque hémorragique)');
  if(at.has('ulcere')) ainsRaisons.push('ulcère ou hémorragie digestive');
  if(at.has('ir_severe') || at.has('ir_moderee')) ainsRaisons.push('insuffisance rénale');
  if(at.has('ih_severe')) ainsRaisons.push('insuffisance hépatique sévère');
  if(at.has('insuf_card')) ainsRaisons.push('insuffisance cardiaque');
  if(tt.has('mtx')) ainsRaisons.push('méthotrexate (interaction)');
  if(enfant && age>0 && age<1) ainsRaisons.push('âge');
  const ainsUtile = ['pulpite','abces','abces_paro','alveolite_seche','alveolite_suppuree','pericoronarite','avulsion','avulsion_incluse','implant','greffe_osseuse','chir_paro','chir_periapicale','trauma_luxation','trauma_expulsion','herpes_primo'].includes(m);
  if(ainsUtile){
    if(!ainsRaisons.length){
      ligne('ibu','Anti-inflammatoire','Ibuprofène', enfant ? (kg?`${arr(kg*10)} mg 3 fois par jour pendant les repas (10 mg/kg, max 30 mg/kg/j)`:'10 mg/kg 3 fois par jour (renseigner le poids)') : '400 mg 3 fois par jour pendant les repas','3 jours');
      if(O.atb) O.pourquoi.push('L’anti-inflammatoire ne justifie pas à lui seul un antibiotique.'+src('HAS 2026'));
    } else O.alertes.push({n:'info',t:'Ibuprofène écarté',d:ainsRaisons.join(' ; ')+'.'+(enceinte?src('ANSM'):'')});
  }
  // Bain de bouche post-chirurgical
  if(['avulsion','implant','greffe_osseuse','chir_paro','mpn','alveolite_suppuree'].includes(m) && !O.lignes.some(l=>l.id==='bdb')){
    if(al.has('chx')) O.alertes.push({n:'moy',t:'Allergie à la chlorhexidine',d:'Pas de bain de bouche à la chlorhexidine (risque d’anaphylaxie). Conseiller des rinçages doux à l’eau salée.'});
    else if(!(enfant && (!age || age<6))) O.lignes.push({id:'bdb',cat:'Antiseptique',med:'Chlorhexidine 0,12 % bain de bouche',pos:'15 mL en bain de bouche de 30 s, 2 fois par jour, à commencer le lendemain',qsp:'7 jours'});
  }

  /* --- 3. Terrain : avertissements --- */
  if(eiHaut){
    alerte('forte','Haut risque d’endocardite','Bain de bouche à la chlorhexidine 0,12 à 0,20 % pendant 1 min avant tout acte. Contre-indiqués : coiffage pulpaire sur dent permanente mature, pulpectomie de dent temporaire, chirurgie avec membrane, traitement de péri-implantite.','HAS 2024');
    if(al.has('chx')) alerte('moy','Allergie à la chlorhexidine','Pas de bain de bouche pré-opératoire à la chlorhexidine.','');
  }
  if(at.has('ei_inter')) alerte('info','Risque intermédiaire d’endocardite','Pas d’antibioprophylaxie spécifique liée à la cardiopathie : les règles de la population générale s’appliquent. Suivi bucco-dentaire régulier.','HAS 2024');
  if(ria) alerte('moy','Risque infectieux augmenté','Antibioprophylaxie pour les actes invasifs (avulsion, endo de dent non vivante, chirurgie) et antibiotique curatif plus facile en cas d’infection.','HAS 2026');
  if(at.has('diabete')) alerte('moy','Diabète déséquilibré (HbA1c ≥ 9 %)','Vérifier une HbA1c de moins de 3 mois. Orienter vers le médecin traitant ou le diabétologue, sans retarder les soins nécessaires.','HAS 2026');
  if(at.has('cortico')) alerte('info','Corticothérapie au long cours','Risque infectieux augmenté et cicatrisation retardée.','HAS 2026');
  if(at.has('immunosup')) alerte('info','Immunosuppresseur ou biothérapie','Le risque infectieux dépend de la molécule : à évaluer au cas par cas, au besoin avec le prescripteur.','HAS 2026');
  if(at.has('drepano')) alerte('moy','Drépanocytose','Risque infectieux à évaluer avec le médecin référent.','HAS 2026');
  if(hron) alerte('forte','Haut risque d’ostéonécrose des mâchoires','Privilégier les gestes non invasifs. Tout acte exposant l’os : antibioprophylaxie et relais de 7 jours, technique atraumatique, fermeture muqueuse, suivi jusqu’à cicatrisation. Anesthésies intraligamentaire et intraosseuse seulement en 2e intention.','HAS 2026');
  if(at.has('bp_benin')) alerte('info','Bisphosphonates pour ostéoporose depuis moins de 5 ans','Pas haut risque d’ostéonécrose selon la HAS : règles de la population générale, avec information du patient et geste atraumatique.','HAS 2026');
  if(at.has('ir_severe') || at.has('ir_moderee')) alerte('moy','Insuffisance rénale','AINS à éviter. Adapter la posologie de l’amoxicilline si DFG < 30 et espacer le paracétamol (voir RCP).','RCP');
  if(at.has('ih') || at.has('ih_severe')) alerte('moy','Insuffisance hépatique ou alcoolisme','Paracétamol : 2 g par jour maximum, 8 h entre les prises.','RCP');
  if(at.has('qt')) alerte('moy','QT long','Éviter azithromycine et clarithromycine.','HAS 2024');
  if(at.has('asthme') && !al.has('ains')) alerte('info','Asthme','AINS contre-indiqués si l’asthme est déclenché par l’aspirine ou les AINS. Vérifier à l’interrogatoire.','RCP');
  if(at.has('cancer_tete_cou')) alerte('moy','Cancer des VADS','Vérifier la dose de radiothérapie reçue au niveau des mâchoires (≥ 40 Gy = haut risque d’ostéonécrose) et les traitements anti-résorbeurs.','HAS 2026');
  if(al.has('latex')) alerte('moy','Allergie au latex','Gants et matériel sans latex, de préférence en début de vacation.','');
  if(al.has('al')) alerte('forte','Allergie aux anesthésiques locaux','Une vraie allergie est rare : bilan allergologique avant les soins pour identifier une molécule utilisable.','');
  if(al.has('iode')) alerte('info','Allergie à la povidone iodée','Pas de Bétadine : antisepsie à la chlorhexidine.','');
  if(al.has('peni') && O.lignes.some(l=>/Amoxicilline/.test(l.med))) {}
  if(al.has('peni') && al.has('cephalo')) alerte('moy','Allergie aux bêta-lactamines','Céfazoline, cefpodoxime et céfuroxime écartés.','');

  /* --- 4. Antithrombotiques (SFCO 2015) --- */
  const chir = !!M.chir;
  const eleve = rep.risque_hemo==='eleve';
  if(tt.has('aap')) alerte('moy','Antiplaquettaire seul : ne pas l’arrêter','Poursuite recommandée quel que soit l’acte de chirurgie orale. Hémostase locale systématique.','SFCO 2015');
  if(tt.has('aap2')){
    if(chir && eleve) alerte('forte','Bithérapie antiplaquettaire et acte à risque hémorragique élevé','Avis du prescripteur obligatoire pour définir la stratégie (il peut décider de suspendre l’un des deux antiplaquettaires). Ne rien arrêter de soi-même.','SFCO 2015');
    else alerte('moy','Bithérapie antiplaquettaire : la poursuivre','Pour un acte à risque hémorragique faible (avulsions, implant sur un secteur), poursuite de la bithérapie recommandée. Hémostase locale systématique. Si l’acte est à risque élevé, l’avis du prescripteur est obligatoire.','SFCO 2015');
  }
  if(tt.has('avk')){
    alerte(chir&&eleve?'forte':'moy','Antivitamine K', (chir&&eleve ? 'Acte à risque hémorragique élevé : avis du prescripteur indispensable (fenêtre thérapeutique de 48 à 72 h possible si risque thrombotique faible). ' : 'Ne pas arrêter. ') + 'INR mesuré dans les 24 h (72 h au plus) avant l’acte : il doit être stable et inférieur à 4, sinon reporter et prévenir le prescripteur. Aspirine et AINS contre-indiqués. Amoxicilline, métronidazole et macrolides peuvent augmenter l’INR : contrôler l’INR dans les jours qui suivent (pas pour une prophylaxie en dose unique).','SFCO 2015');
  }
  if(tt.has('aod')) alerte(chir&&eleve?'forte':'moy','Anticoagulant oral direct', chir&&eleve ? 'Acte à risque hémorragique élevé : avis du prescripteur indispensable. S’il le décide : arrêt la veille et reprise le lendemain (fenêtre de 48 h).' : 'Ne pas arrêter pour un acte à risque hémorragique faible. Hémostase locale systématique. Éviter la clarithromycine.','SFCO 2015');
  if(tt.has('heparine')) alerte('moy','Héparine', chir&&eleve ? 'Acte à risque élevé : le prescripteur peut suspendre l’héparine (6 à 8 h pour l’HNF, 24 h pour une HBPM).' : 'Poursuivre pour un acte à risque faible. Hémostase locale.','SFCO 2015');
  if((tt.has('aap')||tt.has('aap2')||tt.has('avk')||tt.has('aod')||tt.has('heparine')) && chir){
    O.alertes.push({n:'info',t:'Organisation',d:'Intervenir le matin et en début de semaine, de préférence par secteur. Patient joignable en cas de saignement, hôpital à moins d’une heure.'+src('SFCO 2015')});
    if(tt.has('aod')||tt.has('avk')) O.alertes.push({n:'info',t:'Cotation',d:'Supplément YYYY614 (20 €) si le patient est en ALD et traité par AOD ou AVK, une fois par séance.'+src('CCAM V84')});
  }
  if(tt.has('mtx') && O.lignes.some(l=>/Amoxicilline/.test(l.med))) alerte('moy','Méthotrexate et amoxicilline','Interaction : risque de toxicité du méthotrexate. Avis du prescripteur.','RCP');

  /* --- 5. Grossesse, allaitement, enfant --- */
  if(enceinte) O.alertes.push({n:'info',t:'Grossesse',d:'Paracétamol en 1re intention. AINS contre-indiqués à partir du 6e mois (24 SA), à éviter avant.'+src('ANSM')+' Amoxicilline utilisable.'});
  if(p==='allaite') O.alertes.push({n:'info',t:'Allaitement',d:'Paracétamol, ibuprofène et amoxicilline sont compatibles avec l’allaitement en cure courte.'});
  if(enfant && !kg) O.alertes.push({n:'moy',t:'Poids manquant',d:'Renseigne le poids pour calculer les doses.'});
  if(enfant && age>0 && age<6) O.alertes.push({n:'info',t:'Enfant de moins de 6 ans',d:'Pas de comprimé ni de gélule à avaler : formes buvables. Pristinamycine contre-indiquée.'+src('HAS 2026')});
  if(O.atb && !['sinusite','osteite'].includes(m) && O.lignes.some(l=>l.cat==='Antibiotique')) O.alertes.push({n:'info',t:'Réévaluation',d:'Toute antibiothérapie se réévalue à 48-72 h (consultation, téléconsultation ou téléphone).'+src('HAS 2026')});
  return O;
};

/* ---------- Lecture d'une question en langage courant (assistant) ---------- */
const N = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’`]/g,"'");
R.MOTS_MOTIFS = [
  ['cellulite', /cellulite|tumefaction|joue gonflee|visage gonfle|gonflement/],
  ['alveolite_seche', /alveolite seche|alveolite(?!.*suppur)/],
  ['alveolite_suppuree', /alveolite suppur|alveolite.*pus|pus.*alveol/],
  ['pericoronarite', /pericoronarite|capuchon/],
  ['sinusite', /sinusite/],
  ['osteite', /osteite/],
  ['mpn', /necrosante|gun\b|pun\b|gingivite ulcero/],
  ['periimplantite', /peri-?implantite/],
  ['sialadenite', /sialadenite|parotidite|sous-?mandibulite/],
  ['cbs', /communication bucco|cbs\b|hypochlorite|emphyseme/],
  ['candidose', /candid|muguet|mycose|perleche/],
  ['herpes_primo', /gingivostomatite|primo-?infection/],
  ['herpes_recurrent', /herpes|bouton de fievre/],
  ['aphte', /aphte/],
  ['lesion_persistante', /lesion qui ne (guerit|cicatrise)|leucoplasie|ulceration persistante|lichen/],
  ['trauma_morsure', /morsure|souillee/],
  ['trauma_expulsion', /expuls|reimplant/],
  ['trauma_luxation', /luxation|intrusion|extrusion/],
  ['trauma_fracture', /fracture/],
  ['abces_paro', /abces parodontal|abces paro|endo-?paro/],
  ['abces', /abces|parodontite apicale|desmodontite|flambee|granulome|kyste infect/],
  ['pulpite', /pulpite|rage de dent|douleur pulpaire/],
  ['avulsion_incluse', /inclus|enclav|sagesse|ectopique|desinclusion/],
  ['greffe_osseuse', /greffe osseuse|sinus lift|comblement sinusien|augmentation osseuse/],
  ['implant', /implant/],
  ['chir_paro', /lambeau|greffe gingivale|elongation coronaire|chirurgie parodontale/],
  ['detartrage', /detartr|surfac|dsr/],
  ['chir_periapicale', /resection apicale|apicectomie|chirurgie periapicale|chirurgie endo/],
  ['endo', /endo|devitalis|pulpectomie|retraitement|traitement canalaire/],
  ['biopsie', /biopsie|frenectomie|frein|exerese/],
  ['avulsion', /avuls|extrai|extraction|enlever (une|la|des) dent|arracher/],
  ['soins', /composite|obturation|carie|couronne|empreinte|prothese|radio|soin conservateur/],
];
R.MEDICAMENTS = [
  ['aod', /eliquis|apixaban|xarelto|rivaroxaban|pradaxa|dabigatran|lixiana|edoxaban|\baod\b/],
  ['avk', /coumadine|warfarine|previscan|fluindione|sintrom|acenocoumarol|\bavk\b/],
  ['heparine', /lovenox|enoxaparine|innohep|tinzaparine|fragmine|dalteparine|heparine|\bhbpm\b/],
  ['aap', /kardegic|aspirine|aspegic|resitune|plavix|clopidogrel|brilique|ticagrelor|efient|prasugrel|antiagregant|antiplaquettaire|\baap\b/],
  ['sulfamide', /gliclazide|diamicron|glimepiride|amarel|glibenclamide|daonil/],
  ['mtx', /methotrexate|novatrex|metoject|imeth/],
];
R.analyserQuestion = function(texte){
  const t = ' '+N(texte)+' ';
  const rep = {allergies:[], atcd:[], ttt:[], extension:[]};
  for(const [v,rx] of R.MOTS_MOTIFS){ if(rx.test(t)){ rep.motif=v; break; } }
  if(rep.motif==='alveolite_seche' && !/seche/.test(t)) rep.alvAmbigu=true;
  // anti-thrombotiques, avec détection de bithérapie
  const aapNoms = (t.match(/kardegic|aspirine|aspegic|resitune|plavix|clopidogrel|brilique|ticagrelor|efient|prasugrel/g)||[]);
  R.MEDICAMENTS.forEach(([v,rx])=>{ if(rx.test(t)) rep.ttt.push(v); });
  if(new Set(aapNoms).size>=2 || /bitherapie|double anti/.test(t)){ rep.ttt=rep.ttt.filter(x=>x!=='aap'); rep.ttt.push('aap2'); }
  if(/zometa|zoledron|xgeva|bisphosph.*(cancer|metast|myelome)|(cancer|metast|myelome).*bisphosph/.test(t)) rep.atcd.push('bp_malin');
  else if(/prolia|denosumab/.test(t)) rep.atcd.push('denosumab');
  else if(/bisphosph|fosamax|alendron|actonel|risedron|bonviva|ibandron|aclasta/.test(t)) rep.atcd.push(/(\d+|plus de 5|depuis longtemps)\s*ans/.test(t)?'bp_benin5':'bp_benin');
  if(/radioth|irradi/.test(t)) rep.atcd.push('radio40');
  if(/prothese valvul|valve mecanique|tavi|antecedent d'endocardite|endocardite|cardiopathie congenitale cyano/.test(t)) rep.atcd.push('ei_haut');
  else if(/valvulopathie|souffle|pacemaker|stimulateur|defibrillateur|retrecissement aortique|insuffisance mitrale/.test(t)) rep.atcd.push('ei_inter');
  if(/diabet/.test(t) && /desequilibr|hba1c\s*(de\s*)?(9|1\d)|mal equilibr/.test(t)) rep.atcd.push('diabete');
  if(/chimio|aplasie|neutropen/.test(t)) rep.atcd.push('chimio');
  if(/greff[ee]|transplant/.test(t) && !/greffe osseuse|greffe gingivale/.test(t)) rep.atcd.push('greffe');
  if(/cortico|prednisolone|solupred|cortancyl/.test(t)) rep.atcd.push('cortico');
  if(/biotherap|immunosupp|humira|enbrel|remicade|methotrexate/.test(t)) rep.atcd.push('immunosup');
  if(/\bvih\b|\bsida\b/.test(t)) rep.atcd.push('vih');
  if(/dialys/.test(t)) rep.atcd.push('ir_severe'); else if(/insuffisan\w* renal/.test(t)) rep.atcd.push(/sever|terminal/.test(t)?'ir_severe':'ir_moderee');
  if(/insuffisan\w* hepat|cirrhose|alcool/.test(t)) rep.atcd.push(/sever|cirrhose/.test(t)?'ih_severe':'ih');
  if(/ulcere|hemorragie digest/.test(t)) rep.atcd.push('ulcere');
  if(/asthm/.test(t)) rep.atcd.push('asthme');
  if(/drepanocyt/.test(t)) rep.atcd.push('drepano');
  if(/qt long/.test(t)) rep.atcd.push('qt');
  if(/allerg\w*.{0,25}(penicill|amox|augmentin|clamoxyl)/.test(t)) rep.allergies.push('peni');
  if(/allerg\w*.{0,25}(ains|ibuprof|aspirine|anti-?inflam)/.test(t)) rep.allergies.push('ains');
  if(/allerg\w*.{0,25}(chlorhex|eludril|paroex)/.test(t)) rep.allergies.push('chx');
  if(/allerg\w*.{0,25}(macrolide|azithro|clarithro)/.test(t)) rep.allergies.push('macrolides');
  if(/allerg\w*.{0,25}(metronidazole|flagyl)/.test(t)) rep.allergies.push('metro');
  if(/enceinte|grossesse/.test(t)){ rep.profil='enceinte'; if(/(2[4-9]|3\d|4[01])\s*sa|6e mois|[6-9]\s*(e|eme)?\s*mois|troisieme trimestre|3e trimestre/.test(t)) rep.terme='apres'; }
  else if(/allaite|allaitement/.test(t)) rep.profil='allaite';
  const age = t.match(/(\d+)\s*ans/); const kg = t.match(/(\d+[.,]?\d*)\s*kg/);
  if(/enfant|bebe|nourrisson/.test(t) || (age && Number(age[1])<15)){ rep.profil='enfant'; if(age) rep.age=Number(age[1]); if(kg) rep.poids=kg[1].replace(',','.'); }
  if(/pus|suppur/.test(t) && rep.motif!=='alveolite_suppuree') rep.extension.push('suppuration');
  if(/tumefaction|gonfl|trismus/.test(t)) rep.extension.push('tumefaction');
  if(/fievre|ganglion|adenopath|temperature/.test(t)) rep.extension.push('fievre');
  if(/dysphagie|avaler/.test(t)) (rep.gravite=rep.gravite||[]).push('dysphagie');
  if(/respir|dyspnee/.test(t)) (rep.gravite=rep.gravite||[]).push('dyspnee');
  if(/arcade entiere|toute l'arcade|plusieurs secteurs|greffe osseuse|sinus lift/.test(t)) rep.risque_hemo='eleve';
  if(!rep.atcd.length) rep.atcd=['aucun']; if(!rep.ttt.length) rep.ttt=['aucun']; if(!rep.allergies.length) rep.allergies=['aucune'];
  return rep;
};

/* Texte résumé d'une décision, pour l'assistant et pour l'IA */
R.resumer = function(rep, O){
  const strip = s => String(s).replace(/<[^>]+>/g,'');
  const parts = [];
  const M = R.MOTIF[rep.motif];
  if(M) parts.push(`Situation : ${M.t}.`);
  if(O.gestes.length) parts.push('Geste : '+O.gestes.map(strip).join(' '));
  if(O.pourquoi.length) parts.push(O.pourquoi.map(strip).join(' '));
  if(O.lignes.length) parts.push('Ordonnance proposée : '+O.lignes.map(l=>`${l.med}, ${l.pos}, ${l.qsp}`).join(' ; ')+'.');
  O.alertes.forEach(a=>parts.push(`${a.t} : ${strip(a.d)}`));
  return parts.join('\n');
};

window.RECO = R;
})();
