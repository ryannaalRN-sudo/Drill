/* =====================================================================
   Drill — base de connaissances de prescription
   Sources (toujours la version la plus récente) :
   [HAS 2026]  HAS, Prescription des antibiotiques en pratique bucco-dentaire,
               recommandations + fiche de synthèse (adoptées le 16/07/2026,
               publiées le 14/09/2026). Tableaux 1 à 15 reproduits ici.
   [HAS 2024]  HAS, Prise en charge bucco-dentaire des patients à risque
               d'endocardite infectieuse (2024).
   [SFCO 2015] SFCO, Gestion péri-opératoire des patients traités par
               antithrombotiques en chirurgie orale.
   [ANSM]      AINS contre-indiqués à partir du 6e mois de grossesse.
   [RCP]       Résumés des caractéristiques du produit (ANSM, base publique,
               Vidal) : paracétamol, ibuprofène, chlorhexidine (Paroex),
               aciclovir (Zovirax), miconazole (Daktarin, Loramyc),
               amphotéricine B (Fungizone), métronidazole.
   Outil d'aide à la décision : il ne remplace pas le jugement clinique.
   ===================================================================== */
(function(){
const R = {};

/* ---------- Actes et affections ---------- */
R.MOTIFS = [
  {groupe:'Acte prévu', items:[
    {v:'avulsion', t:'Avulsion d’une dent sur arcade', d:'Dent temporaire ou permanente, racines, avec ou sans alvéolectomie ou séparation de racines', chir:true, os:true},
    {v:'avulsion_incluse', t:'Avulsion de dent incluse, ectopique ou en désinclusion', d:'Dont dent de sagesse incluse', chir:true, os:true},
    {v:'autotransplantation', t:'Autotransplantation dentaire', d:'', chir:true, os:true},
    {v:'chir_preortho', t:'Chirurgie pré-orthodontique de dent incluse ou enclavée', d:'Dégagement, mise en place d’un dispositif de traction', chir:true, os:true},
    {v:'chir_preprothetique', t:'Chirurgie osseuse pré-prothétique', d:'Exérèse de torus, ostéotomie tubérositaire', chir:true, os:true},
    {v:'implant', t:'Pose d’implant(s)', d:'', chir:true, os:true},
    {v:'greffe_osseuse', t:'Greffe osseuse ou élévation sinusienne', d:'Augmentation pré ou per-implantaire', chir:true, os:true},
    {v:'chir_paro', t:'Chirurgie parodontale', d:'Assainissement, élongation coronaire, amputation radiculaire, lambeau, greffe gingivale, régénération', chir:true, os:true},
    {v:'chir_periimplantaire', t:'Chirurgie péri-implantaire', d:'Chirurgie plastique ou chirurgie de péri-implantite', chir:true, os:true},
    {v:'detartrage', t:'Détartrage ou surfaçage', d:''},
    {v:'endo', t:'Endodontie de dent permanente non vitale ou retraitement', d:'Symptomatique ou non'},
    {v:'endo_vitale', t:'Endodontie de dent permanente vitale, coiffage ou pulpotomie', d:'Dont pulpectomie ou pulpotomie d’urgence'},
    {v:'endo_temp', t:'Pulpotomie ou traitement endodontique de dent temporaire', d:''},
    {v:'chir_periapicale', t:'Chirurgie endodontique (péri-apicale)', d:'', chir:true, os:true},
    {v:'biopsie_mou', t:'Biopsie ou exérèse de lésion des tissus mous, freinectomie', d:'', chir:true},
    {v:'biopsie_os', t:'Biopsie ou exérèse de lésion osseuse bénigne des mâchoires', d:'', chir:true, os:true},
    {v:'ancrage_ortho', t:'Pose de minivis ou plaque d’ancrage orthodontique', d:'', chir:true, os:true},
    {v:'anesth_il', t:'Anesthésie intraligamentaire ou ostéocentrale', d:''},
    {v:'soins', t:'Acte non invasif', d:'Soin sans atteinte pulpaire, prothèse, empreinte, radio, digue, anesthésie para-apicale, dépose de fils, orthodontie collée'},
  ]},
  {groupe:'Infection ou douleur dentaire', items:[
    {v:'pulpite', t:'Pulpite', d:'Pulpe vivante, douleur'},
    {v:'abces', t:'Parodontite apicale aiguë, abcès apical aigu, flambée infectieuse', d:''},
    {v:'apical_chronique', t:'Parodontite apicale chronique, abcès apical chronique', d:'Lésion périapicale, fistule'},
    {v:'abces_paro', t:'Abcès parodontal ou endo-parodontal', d:''},
    {v:'pericoronarite', t:'Péricoronarite', d:'Dent en éruption, souvent dent de sagesse'},
    {v:'alveolite_seche', t:'Alvéolite sèche', d:'Alvéole vide, douleur intense, pas de pus'},
    {v:'alveolite_suppuree', t:'Alvéolite suppurée', d:'Pus dans l’alvéole'},
    {v:'cellulite', t:'Cellulite cervico-faciale (dermohypodermite)', d:'Tuméfaction des tissus mous, séreuse ou collectée'},
    {v:'sinusite', t:'Sinusite maxillaire aiguë d’origine dentaire', d:''},
    {v:'osteite', t:'Ostéite ou ostéomyélite', d:''},
    {v:'onj', t:'Ostéonécrose des mâchoires', d:'Os exposé'},
    {v:'paro', t:'Gingivite, parodontite, poches résiduelles, mucosite péri-implantaire', d:''},
    {v:'paro34', t:'Parodontite de stade III/IV (dernière séance d’instrumentation)', d:'Biofilm faible pour la destruction, ratio perte osseuse/âge > 1'},
    {v:'mpn', t:'Maladie parodontale nécrosante', d:'Gingivite ou parodontite nécrosante'},
    {v:'periimplantite', t:'Péri-implantite', d:''},
    {v:'greffe_infectee', t:'Infection de greffe osseuse ou gingivale', d:''},
    {v:'sialadenite', t:'Sialadénite bactérienne', d:'Infection d’une glande salivaire'},
    {v:'cbs', t:'Événement per-opératoire', d:'Communication bucco-sinusienne, accident à l’hypochlorite, emphysème cervico-facial'},
  ]},
  {groupe:'Muqueuse buccale', items:[
    {v:'candidose', t:'Candidose (muguet, perlèche, stomatite)', d:''},
    {v:'herpes_primo', t:'Gingivostomatite herpétique', d:'Primo-infection, surtout chez l’enfant'},
    {v:'herpes_recurrent', t:'Herpès labial récurrent', d:'Bouton de fièvre'},
    {v:'aphte', t:'Aphte(s)', d:''},
    {v:'lesion_persistante', t:'Lésion qui ne guérit pas', d:'Ulcération, plaque blanche ou rouge depuis plus de 3 semaines'},
  ]},
  {groupe:'Traumatisme', items:[
    {v:'trauma_expulsion', t:'Expulsion d’une dent permanente (réimplantation)', d:'', chir:true, os:true},
    {v:'trauma_luxation', t:'Luxation, intrusion ou extrusion', d:'Avec ou sans fracture alvéolaire', chir:true, os:true},
    {v:'trauma_fracture', t:'Fracture coronaire, corono-radiculaire ou radiculaire', d:''},
    {v:'trauma_plaie', t:'Plaie des tissus mous', d:''},
    {v:'trauma_morsure', t:'Plaie fortement souillée ou morsure de mammifère', d:''},
  ]},
];
R.MOTIF = {}; R.MOTIFS.forEach(g=>g.items.forEach(i=>R.MOTIF[i.v]={...i, groupe:g.groupe}));

/* Antibioprophylaxie selon l'acte : [population générale, risque infectieux augmenté, haut risque d'ostéonécrose]
   'non' | 'oui' | 'cas' (au cas par cas) | 'complexe' (implants) | 'ci' (acte contre-indiqué)  [HAS 2026, tableaux 1 à 10] */
R.PROPHY = {
  avulsion:            {p:['non','oui','oui'], grade:'A'},
  avulsion_incluse:    {p:['oui','oui','cas'], grade:'A'},
  autotransplantation: {p:['oui','cas','cas'], ciMalin:true, ciRadio:true},
  chir_preortho:       {p:['non','oui','cas'], ciMalin:true, ciRadio:true},
  chir_preprothetique: {p:['non','cas','cas']},
  implant:             {p:['complexe','cas','cas'], ciMalin:true, grade:'B'},
  greffe_osseuse:      {p:['oui','cas','cas'], ciMalin:true, ciRadio:true},
  chir_paro:           {p:['non','cas','cas'], noteCI:'Amputation radiculaire, chirurgie plastique et chirurgie régénératrice sont contre-indiquées en cas de pathologie maligne traitée ou d’irradiation ≥ 40 Gy.'},
  chir_periimplantaire:{p:['non','cas','cas'], noteCI:'La chirurgie de péri-implantite est contre-indiquée en cas de pathologie maligne traitée.'},
  detartrage:          {p:['non','cas','non']},
  endo:                {p:['non','oui','non'], grade:'B'},
  endo_vitale:         {p:['non','non','non']},
  endo_temp:           {p:['non','cas','non']},
  chir_periapicale:    {p:['non','oui','cas'], ciMalin:true, ciRadio:true, grade:'B'},
  biopsie_mou:         {p:['non','oui','non']},
  biopsie_os:          {p:['non','oui','oui']},
  ancrage_ortho:       {p:['non','oui','ci']},
  anesth_il:           {p:['non','non','cas'], noteCI:'Technique de 2e intention. L’anesthésie ostéocentrale est contre-indiquée en cas de pathologie maligne traitée ou d’irradiation ≥ 40 Gy.'},
  soins:               {p:['non','non','non']},
  trauma_expulsion:    {p:['non','cas','ci'], grade:'C'},
  trauma_luxation:     {p:['non','oui','oui']},
  trauma_fracture:     {p:['non','non','non']},
  trauma_plaie:        {p:['non','non','non']},
};
/* Actes invasifs autorisés avec antibioprophylaxie chez le patient à haut risque d'endocardite [HAS 2024] */
R.EI_INVASIF = ['avulsion','avulsion_incluse','autotransplantation','chir_preortho','chir_preprothetique','implant','chir_paro','detartrage','endo','chir_periapicale','biopsie_mou','biopsie_os','ancrage_ortho','anesth_il','trauma_expulsion','trauma_luxation'];

R.AVEC_EXTENSION = ['abces','abces_paro','alveolite_suppuree','pericoronarite','mpn','periimplantite','onj'];
R.EXTENSION = [
  {v:'suppuration', t:'Suppuration', d:'Extension locale'},
  {v:'tumefaction', t:'Tuméfaction ou trismus', d:'Extension régionale'},
  {v:'fievre', t:'Fièvre ou adénopathie', d:'Extension systémique'},
  {v:'geste_impossible', t:'Geste local impossible aujourd’hui', d:'Drainage, débridement ou avulsion non réalisables'},
  {v:'aucun', t:'Aucun de ces signes', d:''},
];
R.GRAVITE_CELLULITE = [
  {v:'dysphagie', t:'Dysphagie', d:''},
  {v:'dyspnee', t:'Difficultés respiratoires', d:'D’autant plus si majorées en décubitus dorsal'},
  {v:'extension', t:'Extension loco-régionale', d:'Plancher buccal, cou, région orbitaire'},
  {v:'crepitant', t:'Crépitant sous-cutané', d:''},
  {v:'observance', t:'Traitement ambulatoire difficile à suivre', d:'Observance douteuse'},
  {v:'aucun', t:'Aucun signe de gravité', d:''},
];
R.IMPLANT_FACTEURS = [
  {v:'plus3', t:'Plus de 3 implants', d:''},
  {v:'immediat', t:'Avulsion-implantation immédiate', d:''},
  {v:'long', t:'Intervention de plus de 1 h 30', d:''},
  {v:'echec', t:'Antécédent de complication d’ostéo-intégration ou os peu vascularisé', d:''},
  {v:'membrane', t:'Utilisation d’une membrane de régénération', d:''},
  {v:'aucun', t:'Aucun de ces facteurs', d:''},
];

R.ALLERGIES = [
  {v:'peni', t:'Pénicillines (amoxicilline)', d:'Allergie avérée ou anaphylaxie probable'},
  {v:'cephalo', t:'Céphalosporines', d:''},
  {v:'macrolides', t:'Macrolides', d:'Clarithromycine, azithromycine'},
  {v:'pristina', t:'Pristinamycine', d:''},
  {v:'metro', t:'Métronidazole', d:''},
  {v:'ains', t:'AINS ou aspirine', d:'Dont asthme déclenché par l’aspirine'},
  {v:'paracetamol', t:'Paracétamol', d:''},
  {v:'chx', t:'Chlorhexidine', d:''},
  {v:'iode', t:'Povidone iodée (Bétadine)', d:''},
  {v:'latex', t:'Latex', d:''},
  {v:'al', t:'Anesthésiques locaux', d:''},
  {v:'aucune', t:'Aucune allergie connue', d:''},
];

R.ATCD = [
  {groupe:'Endocardite (HAS 2024)', items:[
    {v:'ei_haut', t:'Haut risque d’endocardite infectieuse', d:'Antécédent d’endocardite, prothèse valvulaire ou matériel de réparation valvulaire (dont TAVI, clip), cardiopathie congénitale cyanogène complexe, cardiopathie congénitale réparée avec matériel (6 mois, ou à vie si shunt résiduel), assistance ventriculaire'},
    {v:'ei_inter', t:'Risque intermédiaire d’endocardite', d:'Valvulopathie native, cardiomyopathie hypertrophique obstructive, autre cardiopathie congénitale, stimulateur ou défibrillateur avec sonde'},
  ]},
  {groupe:'Risque infectieux augmenté (HAS 2026)', items:[
    {v:'chimio', t:'Chimiothérapie aplasiante en cours', d:''},
    {v:'neutropenie', t:'Neutropénie < 500/mm³', d:''},
    {v:'immunosup', t:'Immunosuppresseur, immunomodulateur ou biothérapie', d:'Risque à évaluer au cas par cas, au besoin avec le prescripteur'},
    {v:'cortico', t:'Corticoïdes ≥ 10 mg/j d’équivalent prednisolone depuis plus de 2 semaines', d:''},
    {v:'greffe', t:'Traitement anti-rejet (greffe d’organe, allogreffe de moelle)', d:''},
    {v:'vih', t:'VIH avec CD4 < 200/mm³', d:''},
    {v:'deficit', t:'Déficit immunitaire congénital ou du complément', d:''},
    {v:'asplenie', t:'Asplénie depuis moins de 5 ans', d:''},
    {v:'diabete', t:'Diabète avec HbA1c ≥ 9 %', d:'HbA1c de moins de 3 mois'},
    {v:'ir_severe', t:'Insuffisance rénale sévère (DFG < 30) ou dialyse', d:''},
    {v:'ih_severe', t:'Insuffisance hépatocellulaire sévère (TP ≤ 50 %)', d:''},
    {v:'drepano', t:'Syndrome drépanocytaire majeur', d:'Risque à évaluer avec le praticien référent'},
  ]},
  {groupe:'Haut risque d’ostéonécrose des mâchoires (HAS 2026)', items:[
    {v:'radio40', t:'Radiothérapie cervico-faciale ≥ 40 Gy sur les mâchoires', d:''},
    {v:'denosumab', t:'Dénosumab (Prolia, Xgeva) : dernière injection < 6 mois', d:''},
    {v:'bp_malin', t:'Bisphosphonates pour une pathologie maligne', d:'Traitement en cours ou passé'},
    {v:'antiangio', t:'Anti-angiogéniques pour une pathologie maligne', d:''},
    {v:'bp_benin5', t:'Bisphosphonates pour ostéoporose ou Paget, 5 ans cumulés ou plus', d:''},
  ]},
  {groupe:'Comparable à la population générale (HAS 2026)', items:[
    {v:'bp_benin', t:'Bisphosphonates pour pathologie bénigne, moins de 5 ans', d:''},
    {v:'denosumab_ancien', t:'Dénosumab : dernière injection > 6 mois', d:''},
    {v:'radio_moins40', t:'Radiothérapie cervico-faciale < 40 Gy', d:''},
    {v:'remission', t:'Pathologie maligne en rémission', d:''},
    {v:'prothese_art', t:'Prothèse articulaire', d:''},
    {v:'diabete_eq', t:'Diabète avec HbA1c < 9 %', d:''},
  ]},
  {groupe:'Autres', items:[
    {v:'malin', t:'Pathologie maligne en cours de traitement', d:'Contre-indique certains actes'},
    {v:'ir_moderee', t:'Insuffisance rénale modérée', d:''},
    {v:'ih', t:'Insuffisance hépatique ou alcoolisme chronique', d:''},
    {v:'ulcere', t:'Ulcère ou antécédent d’hémorragie digestive', d:''},
    {v:'asthme', t:'Asthme', d:''},
    {v:'insuf_card', t:'Insuffisance cardiaque', d:''},
    {v:'qt', t:'QT long ou médicament allongeant le QT', d:''},
    {v:'aucun', t:'Aucun antécédent notable', d:''},
  ]},
];
R.RIA = ['chimio','neutropenie','immunosup','cortico','greffe','vih','deficit','asplenie','diabete','ir_severe','ih_severe','drepano'];
R.HRON = ['radio40','denosumab','bp_malin','antiangio','bp_benin5'];

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
const parPrise = (kg, mgkgj, maxj, prises) => Math.min(arr(kg*mgkgj/prises), Math.floor(maxj/prises));
const dose = (kg, mgkg, max) => Math.min(arr(kg*mgkg), max);
const g = mg => mg>=1000 && mg%500===0 ? String(mg/1000).replace('.',',')+' g' : mg+' mg';
const PROLONGER = 'à prolonger de 2 jours si les symptômes persistent';

/* =====================================================================
   Le moteur de décision
   ===================================================================== */
R.decider = function(rep){
  const m = rep.motif, M = R.MOTIF[m] || {};
  const p = rep.profil||'adulte', enfant = p==='enfant', kg = Number(rep.poids)||0, age = Number(rep.age);
  const al = new Set(rep.allergies||[]), at = new Set(rep.atcd||[]), tt = new Set(rep.ttt||[]), ext = new Set(rep.extension||[]);
  const ria = R.RIA.some(x=>at.has(x)), hron = R.HRON.some(x=>at.has(x)), eiHaut = at.has('ei_haut');
  const malin = at.has('malin') || at.has('bp_malin') || at.has('antiangio'), radio = at.has('radio40');
  const enceinte = p==='enceinte', terme6 = enceinte && rep.terme==='apres';
  const K = enfant && kg>0, moins6 = enfant && (!(age>=0) || age<6);
  const sousAOD = tt.has('aod'), qt = at.has('qt');
  const O = {gestes:[], pourquoi:[], alertes:[], lignes:[], hospit:false, atb:false, prophy:false};
  const src = s => s ? ` <span class="src">${s}</span>` : '';
  const why = (t,s) => O.pourquoi.push(t+src(s));
  const alerte = (n,t,d,s) => O.alertes.push({n,t,d:d+src(s)});
  const ligne = (id,cat,med,pos,qsp) => O.lignes.push({id,cat,med,pos,qsp});
  const buv = moins6 ? ' (forme buvable)' : '';
  const kgManquant = '(dose au poids : renseigner le poids)';

  /* ---- Alternatives aux pénicillines, par ordre de préférence HAS ---- */
  const macroOK = !al.has('macrolides') && !qt;
  const clariOK = macroOK && !sousAOD;
  const pristOK = !al.has('pristina') && !moins6;
  function noteAlternative(){
    if(!macroOK) alerte('moy','Macrolides écartés', qt?'QT long : azithromycine et clarithromycine à éviter.':'Allergie aux macrolides.', qt?'HAS 2024':'');
    else if(sousAOD) alerte('moy','Clarithromycine écartée','À éviter chez un patient sous AOD : azithromycine proposée.','SFCO 2015');
  }

  /* ---- Antibioprophylaxie [HAS 2026 tableaux 11-12 ; HAS 2024] ---- */
  function prophylaxie(raison, source){
    O.atb = O.prophy = true;
    const relaisOs = hron && M.os;
    const peni = al.has('peni');
    if(relaisOs){
      if(!peni) ligne('abp','Antibioprophylaxie puis relais','Amoxicilline'+buv, K?`${g(dose(kg,50,2000))} 1 h avant l’intervention (50 mg/kg, max 2 g), puis ${g(parPrise(kg,50,1500,3))} 3 fois par jour (50 mg/kg/j, max 1,5 g/j)`:(enfant?kgManquant:'2 g 1 h avant l’intervention, puis 500 mg 3 fois par jour'),'7 jours');
      else if(clariOK && !eiHaut) ligne('abp','Antibioprophylaxie puis relais','Clarithromycine'+buv, K?`${g(dose(kg,15,500))} 1 h avant, puis ${g(parPrise(kg,15,1000,2))} 2 fois par jour`:(enfant?kgManquant:'500 mg 1 h avant l’intervention, puis 500 mg 2 fois par jour'),'7 jours');
      else if(macroOK) ligne('abp','Antibioprophylaxie puis relais','Azithromycine'+buv, K?`${g(dose(kg,20,500))} 1 h avant, puis ${g(dose(kg,20,500))} 1 fois par jour`:(enfant?kgManquant:'500 mg 1 h avant l’intervention, puis 500 mg 1 fois par jour'),'2 jours');
      else if(pristOK) ligne('abp','Antibioprophylaxie puis relais','Pristinamycine', K?`${g(dose(kg,25,1000))} 1 h avant, puis ${g(parPrise(kg,50,2000,3))} 3 fois par jour`:(enfant?kgManquant:'1 g 1 h avant l’intervention, puis 1 g 2 fois par jour'),'7 jours');
      else alerte('forte','Aucune alternative orale','Allergies ou contre-indications multiples : avis spécialisé.','');
      if(peni) noteAlternative();
      why(raison+' Acte exposant l’os chez un patient à haut risque d’ostéonécrose : antibioprophylaxie suivie d’un relais post-opératoire.', 'HAS 2026');
    } else {
      if(!peni) ligne('abp','Antibioprophylaxie','Amoxicilline'+buv, K?`${g(dose(kg,50,2000))} en une prise, 30 à 60 min avant l’acte (50 mg/kg, max 2 g)`:(enfant?kgManquant:'2 g en une prise, 30 à 60 min avant l’acte'),'Dose unique');
      else {
        let a=null;
        if(!eiHaut && clariOK) a=['Clarithromycine'+buv, K?`${g(dose(kg,15,500))} (15 mg/kg, max 500 mg)`:'500 mg'];
        else if(macroOK) a=['Azithromycine'+buv, K?`${g(dose(kg,20,500))} (20 mg/kg, max 500 mg)`:'500 mg'];
        else if(pristOK) a=['Pristinamycine', K?`${g(dose(kg,25,1000))} (25 mg/kg, max 1 g)`:'1 g'];
        if(a) ligne('abp','Antibioprophylaxie',a[0], (enfant&&!K)?kgManquant:`${a[1]} en une prise, 30 à 60 min avant l’acte`,'Dose unique');
        else alerte('forte','Aucune alternative orale','Allergies ou contre-indications multiples : céfazoline IV/IM ou clindamycine IV en milieu adapté, avis spécialisé.','HAS 2026');
        noteAlternative();
      }
      why(raison, source||'HAS 2026');
    }
    alerte('info','Oubli ou urgence','L’antibioprophylaxie peut encore être prise jusqu’à 2 h après le geste.','HAS 2026');
    alerte('info','Délivrance à l’unité','L’ordonnance doit préciser une délivrance à l’unité (mention ajoutée au PDF).','HAS 2026');
    if(eiHaut) alerte('info','Séances rapprochées','Espacer d’au moins 3 semaines les séances qui nécessitent une antibioprophylaxie, sinon changer de classe d’antibiotique.','HAS 2024');
  }

  /* ---- Antibiothérapie curative [HAS 2026 tableaux 14-15] ----
     'amox' : amoxicilline, alternatives clarithromycine > azithromycine > pristinamycine
     'peri' : péricoronarite, alternative métronidazole
     'mpn'  : métronidazole, alternative amoxicilline */
  function curatif(type, raison){
    O.atb = true;
    const peni = al.has('peni');
    const amoxPos = K ? `${g(parPrise(kg, m==='cellulite'?90:50, 3000, 3))} 3 fois par jour (${m==='cellulite'?'80 à 100':'50'} mg/kg/j, max 3 g/j)` : (enfant?kgManquant:'1 g 3 fois par jour');
    const metroPos = K ? `${g(parPrise(kg,30,1500,3))} 3 fois par jour (30 mg/kg/j, max 1,5 g/j)` : (enfant?kgManquant:'500 mg 3 fois par jour');
    const qsp3 = `3 jours (${PROLONGER})`;
    const metroLigne = () => { ligne('abc','Antibiotique','Métronidazole'+buv, metroPos, qsp3); alerte('moy','Métronidazole et alcool','Effet antabuse : pas d’alcool pendant le traitement.','RCP'); };
    if(type==='mpn'){
      if(!al.has('metro')) { metroLigne(); why(raison+' Métronidazole en 1re intention, 3 jours.','HAS 2026'); }
      else if(!peni) { ligne('abc','Antibiotique','Amoxicilline'+buv, amoxPos, qsp3); why(raison+' Allergie au métronidazole : amoxicilline en alternative, 3 jours.','HAS 2026'); }
      else alerte('forte','Allergies multiples','Avis spécialisé.','');
    } else if(!peni){
      ligne('abc','Antibiotique','Amoxicilline'+buv, amoxPos, qsp3);
      why(raison+' Amoxicilline en 1re intention, 3 jours.','HAS 2026');
    } else if(type==='peri' && !al.has('metro')){
      metroLigne();
      why(raison+' Allergie aux pénicillines : métronidazole en alternative, 3 jours.','HAS 2026');
    } else {
      if(clariOK) ligne('abc','Antibiotique','Clarithromycine (hors AMM)'+buv, K?`${g(parPrise(kg,15,1000,2))} 2 fois par jour (15 mg/kg/j, max 1 g/j)`:(enfant?kgManquant:'500 mg 2 fois par jour'), qsp3);
      else if(macroOK) ligne('abc','Antibiotique','Azithromycine'+buv, K?`${g(dose(kg,20,500))} 1 fois par jour (20 mg/kg/j, max 500 mg/j)`:(enfant?kgManquant:'500 mg 1 fois par jour'),'3 jours');
      else if(pristOK) ligne('abc','Antibiotique','Pristinamycine (hors AMM)', K?`${g(parPrise(kg,50,2000,3))} 3 fois par jour (50 mg/kg/j, max 2 g/j)`:(enfant?kgManquant:'1 g 2 fois par jour'), qsp3);
      else alerte('forte','Aucune alternative orale','Avis spécialisé.','');
      noteAlternative();
      why(raison+' Allergie aux pénicillines : alternative par ordre de préférence (clarithromycine, azithromycine, pristinamycine).','HAS 2026');
    }
    const deux = enfant
      ? 'amoxicilline + métronidazole (50 + 30 mg/kg/j en 3 prises) ou amoxicilline-acide clavulanique (80 mg/kg/j, max 3 g/j), 3 jours ; si allergie : clarithromycine (15 mg/kg/j en 2 prises) + métronidazole (30 mg/kg/j en 3 prises), 3 jours'
      : 'amoxicilline + métronidazole (1 g + 500 mg, 3 fois par jour) ou amoxicilline-acide clavulanique (1 g / 125 mg, 3 fois par jour), 3 jours ; si allergie : clarithromycine 500 mg 2 fois par jour + métronidazole 500 mg 3 fois par jour, 3 jours';
    alerte('info','Réévaluer à 3 jours','Pas d’amélioration ou aggravation : 2e intention par '+deux+'. Échec de la 2e intention : avis infectiologique.','HAS 2026');
  }

  // Alvéolite suppurée : la suppuration locale ne suffit pas à elle seule [HAS 2026, tableau 13]
  const extension = (m==='alveolite_suppuree' ? ['tumefaction','fievre'] : ['suppuration','tumefaction','fievre']).some(x=>ext.has(x));
  const systemique = ext.has('fievre');
  const gesteImpossible = ext.has('geste_impossible');
  const motifsCond = () => { const r=[]; if(eiHaut) r.push('haut risque d’endocardite'); if(ria) r.push('risque infectieux augmenté'); if(extension) r.push('signes d’extension'); if(gesteImpossible) r.push('geste local impossible'); return r; };

  /* ---- 1. Actes : antibioprophylaxie ---- */
  const T = R.PROPHY[m];
  let actCI = false;
  if(T){
    const [pg, pria, phron] = T.p;
    actCI = (T.ciMalin && malin) || (T.ciRadio && radio) || (hron && phron==='ci');
    const membrane = (rep.implant||[]).includes('membrane');
    if(eiHaut && m==='endo_temp') alerte('forte','Haut risque d’endocardite','La pulpectomie de dent temporaire est contre-indiquée. La pulpotomie de dent temporaire est autorisée avec antibioprophylaxie.','HAS 2024');
    if(eiHaut && m==='endo_vitale') alerte('forte','Haut risque d’endocardite','Le coiffage pulpaire sur dent permanente mature est contre-indiqué. Pulpotomie et pulpectomie de l’adulte : autorisées avec antibioprophylaxie.','HAS 2024');
    const eiCI = eiHaut && (membrane || m==='greffe_osseuse' || m==='chir_periimplantaire');
    if(eiCI) alerte('forte','Contre-indiqué (haut risque d’endocardite)','Toute chirurgie avec membrane de régénération osseuse et tout traitement de péri-implantite sont contre-indiqués. Une greffe ou un sinus lift sans membrane reste à discuter avec le cardiologue.','HAS 2024');
    if(actCI){
      alerte('forte','Acte contre-indiqué', hron && phron==='ci' ? 'Contre-indiqué chez le patient à haut risque d’ostéonécrose des mâchoires.' : 'Contre-indiqué en cas de pathologie maligne traitée'+(T.ciRadio?' ou d’irradiation ≥ 40 Gy':'')+'.','HAS 2026');
      why('Pas de prescription : l’acte lui-même est contre-indiqué chez ce patient.','HAS 2026');
    } else {
      if(T.noteCI && (malin||radio)) alerte('forte','Attention',T.noteCI,'HAS 2026');
      const eiProphy = eiHaut && !eiCI && (R.EI_INVASIF.includes(m) || m==='endo_vitale' || m==='endo_temp');
      if(eiProphy) prophylaxie('Patient à haut risque d’endocardite : acte invasif autorisé avec antibioprophylaxie.','HAS 2024');
      else if(hron && phron!=='non') prophylaxie(phron==='cas' ? 'Haut risque d’ostéonécrose : antibioprophylaxie recommandée, à décider au cas par cas (bénéfice/risque).' : 'Haut risque d’ostéonécrose : antibioprophylaxie recommandée.');
      else if(ria && pria!=='non') prophylaxie(pria==='cas' ? 'Risque infectieux augmenté : antibioprophylaxie recommandée, à décider au cas par cas (bénéfice/risque).' : 'Risque infectieux augmenté : antibioprophylaxie recommandée.');
      else if(pg==='oui') prophylaxie('Antibioprophylaxie recommandée pour cet acte, y compris en population générale'+(T.grade?` (grade ${T.grade})`:'')+'.');
      else if(pg==='complexe' && (rep.implant||[]).some(x=>['plus3','immediat','long','echec'].includes(x))) prophylaxie('Pose d’implant complexe (plus de 3 implants, avulsion-implantation immédiate, plus de 1 h 30, ou antécédent de complication d’ostéo-intégration) : antibioprophylaxie possible.');
      else if(!eiCI){
        const qui = ria ? 'chez un patient à risque infectieux augmenté' : hron ? 'chez un patient à haut risque d’ostéonécrose' : 'en population générale';
        why(`Pas d’antibioprophylaxie pour cet acte ${qui}`+(T.grade&&!ria&&!hron?` (grade ${T.grade})`:'')+'.','HAS 2026');
      }
    }
    if(!actCI && (M.chir || ['detartrage','endo','endo_vitale','endo_temp','anesth_il'].includes(m))){
      const anti = al.has('chx') ? 'povidone iodée' : al.has('iode') ? 'chlorhexidine 0,1 à 0,2 %' : 'chlorhexidine 0,1 à 0,2 % ou povidone iodée';
      O.gestes.push(`Bain de bouche antiseptique avant le geste (${anti}).`);
    }
    const G = {
      avulsion:'Avulsion atraumatique, hémostase locale soigneuse.',
      avulsion_incluse:'Avulsion chirurgicale. Chlorhexidine en post-opératoire pour prévenir l’alvéolite.',
      trauma_expulsion:'Réimplantation au plus vite et contention souple. Vérifier la vaccination antitétanique.',
      trauma_luxation:'Repositionnement et contention.',
      trauma_fracture:'Protection dentino-pulpaire, restauration ou recollage du fragment.',
      trauma_plaie:'Nettoyage, suture si nécessaire. Vérifier la vaccination antitétanique.',
      endo_vitale:'La douleur pulpaire se traite par le geste (pulpotomie ou pulpectomie) et des antalgiques.',
    };
    if(G[m] && !actCI) O.gestes.push(G[m]);
    if(hron && M.os && !actCI) O.gestes.push('Haut risque d’ostéonécrose : geste le moins traumatique possible, fermeture muqueuse, suivi jusqu’à cicatrisation.');
  }

  /* ---- 2. Affections : antibiothérapie curative [HAS 2026 tableau 13] ---- */
  switch(m){
    case 'pulpite':
      O.gestes.push('Geste d’urgence : pulpotomie ou pulpectomie. C’est le geste qui soulage.');
      why('Pas d’antibiotique pour une pulpite (grade C) : la douleur est inflammatoire et se traite par un geste rapide et des antalgiques.','HAS 2026');
      if(eiHaut) alerte('moy','Haut risque d’endocardite','Pulpotomie ou pulpectomie de l’adulte : sous antibioprophylaxie. Coiffage sur dent permanente mature contre-indiqué.','HAS 2024');
      break;
    case 'apical_chronique':
      O.gestes.push('Traitement endodontique (ou retraitement), chirurgie péri-apicale ou avulsion selon la dent.');
      why('Pas d’antibiotique pour une parodontite ou un abcès apical chronique (grade C).','HAS 2026');
      break;
    case 'abces': case 'abces_paro': case 'alveolite_suppuree': case 'periimplantite': {
      const noms = {abces:'cette parodontite apicale aiguë, abcès apical aigu ou flambée', abces_paro:'cet abcès parodontal ou endo-parodontal', alveolite_suppuree:'cette alvéolite suppurée', periimplantite:'cette péri-implantite'};
      if(m==='periimplantite' && eiHaut){ alerte('forte','Traitement contre-indiqué','Tout traitement de la péri-implantite est contre-indiqué chez le patient à haut risque d’endocardite : orienter.','HAS 2024'); break; }
      O.gestes.push({abces:'Drainage : trépanation et pulpectomie, incision ou avulsion selon la dent.', abces_paro:'Drainage et débridement de la poche, ou avulsion.', alveolite_suppuree:'Irrigation et curetage doux de l’alvéole.', periimplantite:'Débridement et décontamination de la surface implantaire.'}[m]);
      const r = motifsCond();
      if(r.length) curatif('amox', `Antibiotique ${gesteImpossible&&r.length===1?'possible':'recommandé'} pour ${noms[m]} (${r.join(', ')}), en complément du geste local.`);
      else why(`Pas d’antibiotique : sans signe d’extension, chez un patient sans risque particulier et avec un geste local réalisé, ${noms[m]} se traite par le geste.`+(m==='alveolite_suppuree'?' La suppuration locale ne suffit pas à elle seule à justifier un antibiotique.':''),'HAS 2026');
      break; }
    case 'pericoronarite':
      O.gestes.push('Irrigation et nettoyage sous le capuchon muqueux. Avulsion de la dent ou du capuchon à discuter à froid.');
      if(extension) curatif('peri','Infection d’origine péricoronaire avec signe d’extension : antibiotique recommandé (grade C).');
      else why('Pas d’antibiotique pour une inflammation péricoronaire sans signe d’extension (grade C).','HAS 2026');
      break;
    case 'alveolite_seche':
      O.gestes.push('Irrigation douce, retrait des débris, pansement intra-alvéolaire antalgique.');
      why('Pas d’antibiotique pour une alvéolite sèche (grade C) : traitement local et antalgique.','HAS 2026');
      break;
    case 'cellulite': {
      const grav = (rep.gravite||[]).filter(x=>x!=='aucun');
      if(grav.length){ O.hospit=true; alerte('forte','Prise en charge hospitalière','Signe de gravité ou traitement ambulatoire difficile : hospitalisation avec antibiothérapie IV possible, puis relais per os.','HAS 2026'); }
      O.gestes.push('Traiter la cause dentaire (drainage endodontique, incision si collection, avulsion) : l’antibiotique ne remplace pas le geste.');
      curatif('amox','Une cellulite, séreuse ou collectée, comporte une tuméfaction, donc un signe d’extension régionale : antibiotique recommandé (grade B).');
      break; }
    case 'greffe_infectee':
      O.gestes.push('Débridement, dépose du matériel non intégré si nécessaire.');
      curatif('amox','Infection de greffe osseuse ou gingivale : antibiotique recommandé.');
      break;
    case 'sialadenite':
      O.gestes.push('Hydratation, massages glandulaires, sialogogues. Avis spécialisé si collection ou lithiase.');
      curatif('amox','Sialadénite bactérienne : antibiotique recommandé (grade C).');
      break;
    case 'mpn':
      O.gestes.push('Débridement doux des lésions nécrotiques, hygiène orale, bain de bouche antiseptique.');
      if(systemique) curatif('mpn','Maladie parodontale nécrosante avec atteinte systémique : antibiotique recommandé (grade C).');
      else if(eiHaut || ria || gesteImpossible) curatif('mpn', `Maladie parodontale nécrosante sans atteinte systémique, mais ${motifsCond().filter(x=>x!=='signes d’extension').join(', ')} : antibiotique recommandé.`);
      else why('Pas d’antibiotique pour une maladie parodontale nécrosante sans atteinte systémique (grade C).','HAS 2026');
      break;
    case 'paro':
      O.gestes.push('Traitement parodontal (contrôle de plaque, détartrage-surfaçage) ou péri-implantaire non chirurgical.');
      why('Pas d’antibiotique pour une gingivite (grade B), une parodontite (grade A), des poches résiduelles ou une mucosite péri-implantaire (grade B).','HAS 2026');
      break;
    case 'paro34':
      if(enfant){ why('Indication décrite chez l’adulte : avis spécialisé.','HAS 2026'); break; }
      O.atb = true;
      O.gestes.push('Antibiotique à débuter après la dernière séance d’instrumentation sous-gingivale.');
      if(!al.has('peni') && !al.has('metro')) ligne('abc','Antibiotique','Amoxicilline + métronidazole','500 mg + 500 mg, 3 fois par jour','3 jours');
      else if(!al.has('metro')) ligne('abc','Antibiotique','Métronidazole','500 mg 3 fois par jour','3 jours');
      else if(macroOK) ligne('abc','Antibiotique','Azithromycine','500 mg 1 fois par jour','3 jours');
      if(!al.has('metro')) alerte('moy','Métronidazole et alcool','Effet antabuse : pas d’alcool pendant le traitement.','RCP');
      why('Parodontite de stade III/IV avec inadéquation biofilm/destruction et ratio perte osseuse/âge > 1 : bithérapie recommandée après la dernière séance (grade AE).','HAS 2026');
      break;
    case 'sinusite':
      O.atb = true; O.gestes.push('Traiter la dent causale. Avis ORL en cas d’échec.');
      if(!al.has('peni')) ligne('abc','Antibiotique','Amoxicilline + acide clavulanique'+buv, K?`${g(parPrise(kg,80,3000,3))} (équivalent amoxicilline) 3 fois par jour (80 mg/kg/j, max 3 g/j)`:(enfant?kgManquant:'1 g / 125 mg 3 fois par jour'), enfant?'10 jours':'7 jours');
      else if(!al.has('cephalo')) ligne('abc','Antibiotique', enfant?'Cefpodoxime proxétil'+buv:'Cefpodoxime proxétil (ou céfuroxime axétil 250 mg 2 fois par jour)', K?`${g(parPrise(kg,8,400,2))} 2 fois par jour (8 mg/kg/j, max 400 mg/j)`:(enfant?kgManquant:'200 mg 2 fois par jour'), enfant?'10 jours':'5 jours');
      else if(enfant) ligne('abc','Antibiotique','Sulfaméthoxazole + triméthoprime', K?`30 + 6 mg/kg/j en 2 prises (max 800/160 mg/j)`:kgManquant,'10 jours');
      else if(pristOK) ligne('abc','Antibiotique','Pristinamycine','1 g 2 fois par jour','4 jours');
      why('Sinusite maxillaire aiguë d’origine dentaire : antibiotique recommandé (grade C), une des rares indications de bithérapie en 1re intention. Échec : avis ORL.','HAS 2026');
      break;
    case 'osteite': case 'onj': {
      if(m==='onj' && !extension){ why('Pas d’antibiotique pour une ostéonécrose des mâchoires sans signe d’infection (grade C).','HAS 2026'); O.gestes.push('Suivi spécialisé, hygiène, bain de bouche antiseptique, pas de geste osseux agressif.'); break; }
      O.atb = true; O.hospit = (m==='onj');
      O.gestes.push('Prélèvement osseux pour analyse microbiologique avant l’antibiotique, puis adaptation à l’antibiogramme. Orienter vers un service spécialisé.');
      alerte(m==='onj'?'forte':'moy','Prise en charge hospitalière', m==='onj'?'Ostéonécrose avec signe d’extension : hospitalisation avec antibiothérapie IV possible.':'Indiquée en cas d’ostéomyélite.','HAS 2026');
      if(!al.has('peni')) ligne('abc','Antibiotique','Amoxicilline + acide clavulanique'+buv, K?`${g(parPrise(kg,80,3000,3))} 3 fois par jour (80 mg/kg/j, max 3 g/j)`:(enfant?kgManquant:'1 g / 125 mg 3 fois par jour'),'14 jours au moins, jusqu’à disparition des signes infectieux locaux');
      else { ligne('abc','Antibiotique','Clarithromycine (hors AMM)'+buv, K?`${g(parPrise(kg,15,1000,2))} 2 fois par jour`:(enfant?kgManquant:'500 mg 2 fois par jour'),'14 jours au moins'); ligne('abc2','Antibiotique','Métronidazole'+buv, K?`${g(parPrise(kg,30,1500,3))} 3 fois par jour`:(enfant?kgManquant:'500 mg 3 fois par jour'),'14 jours au moins'); }
      why((m==='onj'?'Ostéonécrose des mâchoires avec signe d’extension':'Ostéite ou ostéomyélite')+' : bithérapie d’au moins 14 jours (grade AE). 2e intention : selon le prélèvement osseux.','HAS 2026');
      break; }
    case 'cbs':
      O.atb = true; O.gestes.push('Fermeture de la communication si indiquée. Consignes : ne pas se moucher fort, éternuer bouche ouverte.');
      if(!al.has('peni')) ligne('abc','Antibiotique','Amoxicilline'+buv, K?`${g(parPrise(kg,50,2000,3))} 3 fois par jour (50 mg/kg/j, max 2 g/j)`:(enfant?kgManquant:'1 g 2 fois par jour'),'5 jours');
      else if(clariOK) ligne('abc','Antibiotique','Clarithromycine'+buv, K?`${g(parPrise(kg,15,1000,2))} 2 fois par jour`:(enfant?kgManquant:'500 mg 2 fois par jour'),'5 jours');
      else if(macroOK) ligne('abc','Antibiotique','Azithromycine'+buv, K?`${g(dose(kg,20,500))} 1 fois par jour`:(enfant?kgManquant:'500 mg 1 fois par jour'),'3 jours');
      else if(pristOK) ligne('abc','Antibiotique','Pristinamycine', K?`${g(parPrise(kg,50,2000,3))} 3 fois par jour`:(enfant?kgManquant:'1 g 2 fois par jour'),'5 jours');
      if(al.has('peni')) noteAlternative();
      why('Communication bucco-sinusienne, accident à l’hypochlorite ou emphysème cervico-facial : antibiotique post-opératoire recommandé (grade AE).','HAS 2026');
      break;
    case 'trauma_morsure':
      O.atb = true; O.gestes.push('Lavage abondant, parage. Vérifier la vaccination antitétanique.');
      if(!al.has('peni')) ligne('abc','Antibiotique','Amoxicilline + acide clavulanique'+buv, K?`${g(parPrise(kg,80,3000,3))} 3 fois par jour (80 mg/kg/j, max 3 g/j)`:(enfant?kgManquant:'1 g / 125 mg 3 fois par jour'),'5 jours');
      else if(pristOK) ligne('abc','Antibiotique','Pristinamycine', K?`${g(parPrise(kg,50,3000,3))} 3 fois par jour (50 mg/kg/j, max 3 g/j)`:(enfant?kgManquant:'1 g 3 fois par jour'),'5 jours');
      else ligne('abc','Antibiotique','Clindamycine'+buv, K?`${g(parPrise(kg,30,1800,3))} 3 fois par jour (30 mg/kg/j, max 1,8 g/j)`:(enfant?kgManquant:'600 mg 3 fois par jour'),'5 jours');
      why('Plaie fortement souillée ou morsure de mammifère : antibiotique recommandé.','HAS 2026');
      break;
    case 'candidose': {
      O.gestes.push('Rechercher la cause : prothèse (nettoyage, retrait la nuit), corticoïdes inhalés (rincer la bouche après usage), immunodépression, diabète, sécheresse buccale.');
      if(tt.has('avk') || tt.has('sulfamide')){
        alerte('forte','Miconazole contre-indiqué','Contre-indiqué avec les antivitamines K (hémorragies graves) et les sulfamides hypoglycémiants, y compris en gel buccal.','RCP');
        ligne('afg','Antifongique','Amphotéricine B 10 % suspension buvable (Fungizone)', enfant ? (kg>30?'15 mL par jour (3 cuillères à café), en bain de bouche puis avalé':(kg?`${Math.round(kg/2)} mL par jour (1 mL pour 2 kg), en 2 prises`:'1 mL pour 2 kg et par jour')) : '15 à 20 mL par jour (3 à 4 cuillères à café) en 2 à 3 prises, en bain de bouche puis avalé','2 à 3 semaines');
      } else if(ria && !enfant){
        ligne('afg','Antifongique','Miconazole 50 mg comprimé gingival muco-adhésif (Loramyc)','1 comprimé par jour appliqué sur la gencive','7 à 14 jours');
      } else {
        ligne('afg','Antifongique','Miconazole 2 % gel buccal (Daktarin)', enfant && age>=0 && age<2 ? '1,25 mL 4 fois par jour, à distance des repas (dès 4 mois)' : '2,5 mL 4 fois par jour, à distance des repas, à garder en bouche avant d’avaler','7 à 15 jours');
      }
      why('Candidose buccale : antifongique local, pas d’antibiotique. Forme étendue ou immunodépression sévère : avis médical pour un traitement par voie générale.','RCP');
      break; }
    case 'herpes_primo':
      O.gestes.push('Hydratation, alimentation froide et molle, antalgiques. Hospitalisation si l’enfant ne boit plus.');
      ligne('av','Antiviral','Aciclovir 200 mg/5 mL suspension buvable', enfant && age>=0 && age<2 ? '100 mg (2,5 mL) 5 fois par jour, environ toutes les 4 h' : '200 mg (5 mL) 5 fois par jour, environ toutes les 4 h','5 jours');
      why('Primo-infection herpétique : aciclovir le plus tôt possible. Pas d’antibiotique.','RCP');
      break;
    case 'herpes_recurrent':
      O.gestes.push('Soins locaux, ne pas toucher les lésions. Reporter les soins non urgents tant que les lésions sont actives (contagion).');
      why('Herpès labial récurrent : traitement symptomatique. Pas d’antibiotique.','');
      break;
    case 'aphte':
      O.gestes.push('Traitement symptomatique local, éviter les aliments irritants. Bilan si aphtes très fréquents ou géants.');
      why('Pas d’antibiotique pour des aphtes.','');
      break;
    case 'lesion_persistante':
      alerte('forte','Orienter rapidement','Une lésion qui ne guérit pas en 3 semaines doit être explorée (biopsie ou avis spécialisé) pour éliminer une lésion maligne.','');
      why('Pas de prescription d’attente : l’urgence est le diagnostic.','');
      break;
  }

  /* ---- 3. Antalgiques et bain de bouche [RCP, ANSM] ---- */
  const douleur = !actCI && !['soins','lesion_persistante','candidose','detartrage','paro','paro34','biopsie_mou','anesth_il','herpes_recurrent'].includes(m);
  if(douleur && !al.has('paracetamol')){
    let pos;
    if(enfant) pos = kg ? `${arr(kg*15)} mg toutes les 6 h si douleur (15 mg/kg, max 60 mg/kg/j)` : '15 mg/kg toutes les 6 h si douleur (renseigner le poids)';
    else if(at.has('ih') || at.has('ih_severe')) pos = '1 g par prise si douleur, au moins 8 h entre deux prises, sans dépasser 2 g par jour';
    else if(at.has('ir_severe')) pos = '1 g par prise si douleur, au moins 6 h entre deux prises (8 h si clairance < 10 mL/min), sans dépasser 3 g par jour (2 g si clairance < 10)';
    else pos = '1 g par prise si douleur, au moins 4 h entre deux prises, sans dépasser 3 g par jour';
    ligne('para','Antalgique','Paracétamol'+(moins6?' (forme buvable)':''), pos, '5 jours');
  }
  const ainsNon = [];
  if(terme6) ainsNon.push('grossesse à partir du 6e mois (contre-indication absolue)');
  else if(enceinte) ainsNon.push('grossesse : à éviter, contre-indiqués à partir du 6e mois');
  if(al.has('ains')) ainsNon.push('allergie aux AINS ou à l’aspirine');
  if(tt.has('avk')) ainsNon.push('antivitamine K (contre-indiqués)');
  if(tt.has('aod') || tt.has('aap') || tt.has('aap2') || tt.has('heparine')) ainsNon.push('antithrombotique (risque hémorragique majoré)');
  if(at.has('ulcere')) ainsNon.push('ulcère ou hémorragie digestive');
  if(at.has('ir_severe') || at.has('ir_moderee')) ainsNon.push('insuffisance rénale');
  if(at.has('ih_severe')) ainsNon.push('insuffisance hépatique sévère');
  if(at.has('insuf_card')) ainsNon.push('insuffisance cardiaque');
  if(tt.has('mtx')) ainsNon.push('méthotrexate (interaction)');
  const ainsUtile = !actCI && ['pulpite','abces','abces_paro','alveolite_seche','alveolite_suppuree','pericoronarite','avulsion','avulsion_incluse','autotransplantation','chir_preortho','chir_preprothetique','implant','greffe_osseuse','chir_paro','chir_periapicale','chir_periimplantaire','trauma_luxation','trauma_expulsion','endo','endo_vitale','herpes_primo','biopsie_os'].includes(m);
  if(ainsUtile){
    if(!ainsNon.length) ligne('ibu','Anti-inflammatoire','Ibuprofène', enfant ? (kg?`${arr(kg*10)} mg 3 fois par jour au cours des repas (10 mg/kg, max 30 mg/kg/j, dès 3 mois)`:'10 mg/kg 3 fois par jour (renseigner le poids)') : '400 mg 3 fois par jour au cours des repas (max 1 200 mg/j)','3 jours');
    else alerte('info','Ibuprofène écarté', ainsNon.join(' ; ')+'.', enceinte?'ANSM':'RCP');
    if(O.atb && !ainsNon.length) why('L’anti-inflammatoire ne justifie pas à lui seul un antibiotique.','HAS 2026');
  }
  if(!actCI && ['avulsion','avulsion_incluse','autotransplantation','implant','greffe_osseuse','chir_paro','chir_periimplantaire','chir_preprothetique','chir_preortho','mpn','alveolite_suppuree','biopsie_os','chir_periapicale'].includes(m)){
    if(al.has('chx')) alerte('moy','Allergie à la chlorhexidine','Pas de bain de bouche à la chlorhexidine (risque d’anaphylaxie).','');
    else if(!moins6) ligne('bdb','Antiseptique','Chlorhexidine 0,12 % bain de bouche (Paroex)','15 mL en bain de bouche d’1 min, 2 fois par jour après les repas, à commencer le lendemain, sans rincer après','7 jours');
  }

  /* ---- 4. Terrain ---- */
  if(eiHaut) alerte('forte','Haut risque d’endocardite','Bain de bouche à la chlorhexidine 0,12 à 0,20 % pendant 1 min avant tout acte. Contre-indiqués : coiffage pulpaire sur dent permanente mature, pulpectomie de dent temporaire, chirurgie avec membrane, traitement de péri-implantite. Allergie aux pénicillines : azithromycine ou pristinamycine.','HAS 2024');
  if(at.has('ei_inter')) alerte('info','Risque intermédiaire d’endocardite','Pas d’antibioprophylaxie liée à la cardiopathie : règles de la population générale. Suivi bucco-dentaire régulier.','HAS 2024');
  if(ria) alerte('moy','Risque infectieux augmenté','Le niveau de risque varie selon la pathologie : en cas de doute, contacter le médecin référent.','HAS 2026');
  if(at.has('diabete')) alerte('moy','Diabète avec HbA1c ≥ 9 %','Vérifier une HbA1c de moins de 3 mois. Orienter vers le médecin traitant ou le diabétologue, sans retarder les soins nécessaires.','HAS 2026');
  if(at.has('immunosup')) alerte('info','Immunosuppresseur ou biothérapie','Risque infectieux à évaluer selon la molécule, au besoin avec le prescripteur.','HAS 2026');
  if(at.has('drepano')) alerte('moy','Drépanocytose majeure','Risque infectieux à évaluer avec le praticien référent.','HAS 2026');
  if(hron) alerte('forte','Haut risque d’ostéonécrose des mâchoires','Privilégier les actes non invasifs. Anesthésies intraligamentaire et ostéocentrale seulement en 2e intention.','HAS 2026');
  if(['bp_benin','denosumab_ancien','radio_moins40','remission','prothese_art','diabete_eq'].some(x=>at.has(x)) && !ria && !hron) alerte('info','Assimilé à la population générale','Cet antécédent ne modifie pas l’indication d’antibiotique selon la HAS.','HAS 2026');
  if(at.has('ir_severe') || at.has('ir_moderee')) alerte('moy','Insuffisance rénale','Antibioprophylaxie en prise unique : pas d’adaptation. Antibiothérapie prolongée ou curative : adapter au DFG. AINS à éviter.','HAS 2026');
  if(at.has('ih') || at.has('ih_severe')) alerte('moy','Insuffisance hépatique ou alcoolisme','Paracétamol : 2 g par jour au maximum, 8 h entre les prises.','RCP');
  if(qt && !al.has('peni')) alerte('info','QT long','Si une alternative à l’amoxicilline était nécessaire : éviter azithromycine et clarithromycine.','HAS 2024');
  if(at.has('asthme') && !al.has('ains')) alerte('info','Asthme','AINS contre-indiqués si l’asthme est déclenché par l’aspirine ou les AINS : vérifier à l’interrogatoire.','RCP');
  if(al.has('latex')) alerte('moy','Allergie au latex','Gants et matériel sans latex, de préférence en début de vacation.','');
  if(al.has('al')) alerte('forte','Allergie aux anesthésiques locaux','Vraie allergie rare : bilan allergologique avant les soins pour identifier une molécule utilisable.','');
  if(al.has('iode')) alerte('info','Allergie à la povidone iodée','Antisepsie à la chlorhexidine.','');
  if(al.has('peni') && al.has('cephalo')) alerte('info','Allergie aux bêta-lactamines','Céphalosporines également écartées.','');

  /* ---- 5. Antithrombotiques [SFCO 2015] ---- */
  const chir = !!M.chir;
  const eleve = rep.risque_hemo==='eleve';
  if(tt.has('aap')) alerte('moy','Antiplaquettaire seul : ne pas l’arrêter','Poursuite recommandée pour tout acte de chirurgie orale, quel que soit le risque hémorragique. Hémostase locale systématique.','SFCO 2015');
  if(tt.has('aap2')){
    if(chir && eleve) alerte('forte','Bithérapie antiplaquettaire et acte à risque hémorragique élevé','Avis du prescripteur obligatoire pour définir la stratégie : il peut décider de suspendre l’un des deux antiplaquettaires. Ne rien arrêter de soi-même.','SFCO 2015');
    else alerte('moy','Bithérapie antiplaquettaire','Poursuite recommandée pour un acte à risque hémorragique faible (avulsions, implant sur un secteur). Si l’acte est à risque élevé : avis du prescripteur obligatoire.','SFCO 2015');
  }
  if(tt.has('avk')) alerte(chir&&eleve?'forte':'moy','Antivitamine K', (chir&&eleve?'Acte à risque hémorragique élevé : avis du prescripteur indispensable (fenêtre de 48 à 72 h possible si le risque thrombotique est faible). ':'Ne pas arrêter pour un acte à risque faible. ')+'INR mesuré dans les 24 h (72 h au plus) avant l’acte, stable et inférieur à 4 ; sinon reporter et prévenir le prescripteur. Aspirine et AINS contre-indiqués. Amoxicilline, métronidazole et macrolides (sauf spiramycine) peuvent augmenter l’INR : contrôle dans les jours suivants (inutile pour une prophylaxie en prise unique).','SFCO 2015');
  if(tt.has('aod')) alerte(chir&&eleve?'forte':'moy','Anticoagulant oral direct', chir&&eleve?'Acte à risque hémorragique élevé : avis du prescripteur indispensable. S’il le décide : arrêt la veille et reprise le lendemain (fenêtre de 48 h).':'Ne pas arrêter pour un acte à risque faible. Hémostase locale systématique. Éviter la clarithromycine.','SFCO 2015');
  if(tt.has('heparine')) alerte('moy','Héparine', chir&&eleve?'Acte à risque élevé : le prescripteur peut suspendre l’héparine (6 à 8 h pour l’HNF, 24 h pour une HBPM).':'Poursuivre pour un acte à risque faible. Hémostase locale.','SFCO 2015');
  if(['aap','aap2','avk','aod','heparine'].some(x=>tt.has(x)) && chir){
    alerte('info','Organisation','Intervenir le matin et en début de semaine, de préférence par secteur. Patient joignable en cas de saignement, hôpital à moins d’une heure.','SFCO 2015');
    if(tt.has('aod')||tt.has('avk')) alerte('info','Cotation','Supplément YYYY614 (20 €) si le patient est en ALD et traité par AOD ou AVK, une fois par séance.','CCAM V84');
  }
  if(tt.has('mtx') && O.lignes.some(l=>/Amoxicilline/.test(l.med))) alerte('moy','Méthotrexate et amoxicilline','Interaction : risque de toxicité du méthotrexate. Avis du prescripteur.','RCP');

  /* ---- 6. Grossesse, allaitement, enfant ---- */
  if(enceinte) alerte('info','Grossesse','Amoxicilline, clarithromycine, azithromycine et métronidazole sont utilisables quel que soit le terme (vérifier sur lecrat.fr). Paracétamol en 1re intention ; AINS contre-indiqués à partir du 6e mois.','HAS 2026');
  if(p==='allaite') alerte('info','Allaitement','Attention particulière au choix de la molécule : vérifier sur lecrat.fr.','HAS 2026');
  if(enfant && !kg) alerte('moy','Poids manquant','Renseigne le poids pour calculer les doses.','');
  if(moins6) alerte('info','Enfant de moins de 6 ans','Pas de comprimé ni de gélule à avaler : formes buvables (pristinamycine exclue).','HAS 2026');
  if(O.atb) alerte('info','Hors AMM','Plusieurs schémas (antibioprophylaxie dentaire hors amoxicilline, clarithromycine et pristinamycine en curatif) sont hors AMM : le prescripteur en est responsable et doit en informer le patient.','HAS 2026');
  return O;
};

/* ---------- Lecture d'une question en langage courant (assistant) ---------- */
const N = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’`]/g,"'");
R.MOTS_MOTIFS = [
  ['cellulite', /cellulite|dermohypodermite|joue gonflee|visage gonfle/],
  ['alveolite_suppuree', /alveolite suppur|alveolite.{0,20}pus|pus.{0,20}alveol/],
  ['alveolite_seche', /alveolite/],
  ['pericoronarite', /pericoronar|capuchon/],
  ['sinusite', /sinusite/],
  ['onj', /osteonecrose|\bonm\b|\bonj\b|os expose/],
  ['osteite', /osteite|osteomyelite/],
  ['mpn', /necrosante|\bgun\b|\bpun\b|gingivite ulcero/],
  ['paro34', /stade (iii|3|iv|4)|parodontite agressive/],
  ['periimplantite', /peri-?implantite/],
  ['greffe_infectee', /greffe infect|infection de (la )?greffe/],
  ['sialadenite', /sialadenite|parotidite|sous-?mandibulite/],
  ['cbs', /communication bucco|\bcbs\b|hypochlorite|emphyseme/],
  ['candidose', /candid|muguet|mycose|perleche/],
  ['herpes_primo', /gingivostomatite|primo-?infection/],
  ['herpes_recurrent', /herpes|bouton de fievre/],
  ['aphte', /aphte/],
  ['lesion_persistante', /ne (guerit|cicatrise) pas|leucoplasie|ulceration persistante|lichen/],
  ['trauma_morsure', /morsure|souillee/],
  ['trauma_expulsion', /expuls|reimplant/],
  ['trauma_luxation', /luxation|intrusion|extrusion/],
  ['trauma_fracture', /fracture/],
  ['abces_paro', /abces parodontal|abces paro|endo-?paro/],
  ['apical_chronique', /chronique|fistul|granulome|kyste apical|lesion periapicale/],
  ['abces', /abces|parodontite apicale|desmodontite|flambee|flare/],
  ['pulpite', /pulpite|rage de dent|douleur pulpaire/],
  ['autotransplantation', /autotranspl/],
  ['chir_preortho', /degagement|traction ortho|pre-?orthodontique/],
  ['ancrage_ortho', /minivis|mini-?vis|ancrage/],
  ['chir_preprothetique', /torus|tori\b|tuberosit/],
  ['avulsion_incluse', /inclus|enclav|sagesse|ectopique|desinclusion/],
  ['greffe_osseuse', /greffe osseuse|sinus lift|elevation sinusienne|comblement sinusien|augmentation osseuse/],
  ['chir_periimplantaire', /chirurgie peri-?implant/],
  ['implant', /implant/],
  ['chir_paro', /lambeau|greffe gingivale|elongation coronaire|chirurgie parodontale|amputation radiculaire/],
  ['paro', /gingivite|parodontite|mucosite|poche/],
  ['detartrage', /detartr|surfac|\bdsr\b/],
  ['chir_periapicale', /resection apicale|apicectomie|chirurgie periapicale|chirurgie endo/],
  ['endo_temp', /pulpotomie.{0,25}(temporaire|lait)|(temporaire|lait).{0,25}(pulpotomie|pulpectomie|endo)/],
  ['endo_vitale', /coiffage|pulpotomie|biopulp/],
  ['endo', /endo|devitalis|pulpectomie|retraitement|traitement canalaire/],
  ['biopsie_os', /biopsie.{0,20}os|lesion osseuse|kyste/],
  ['biopsie_mou', /biopsie|frenectomie|freinectomie|frein|exerese/],
  ['anesth_il', /intraligamentaire|osteocentrale|intra-?osseuse/],
  ['avulsion', /avuls|extrai|extraction|enlever (une|la|des) dent|arracher/],
  ['soins', /composite|obturation|carie|couronne|empreinte|prothese|radio|soin conservateur|digue/],
];
R.analyserQuestion = function(texte){
  const t = ' '+N(texte)+' ';
  const rep = {allergies:[], atcd:[], ttt:[], extension:[]};
  for(const [v,rx] of R.MOTS_MOTIFS){ if(rx.test(t)){ rep.motif=v; break; } }
  if(rep.motif==='alveolite_seche' && !/seche/.test(t)) rep.alvAmbigu=true;
  const aapNoms = new Set((t.match(/kardegic|aspirine|aspegic|resitune|plavix|clopidogrel|brilique|ticagrelor|efient|prasugrel/g)||[]).map(x=>({aspegic:'aspirine',resitune:'aspirine',kardegic:'aspirine',plavix:'clopidogrel',brilique:'ticagrelor',efient:'prasugrel'}[x]||x)));
  if(/eliquis|apixaban|xarelto|rivaroxaban|pradaxa|dabigatran|lixiana|edoxaban|\baod\b/.test(t)) rep.ttt.push('aod');
  if(/coumadine|warfarine|previscan|fluindione|sintrom|acenocoumarol|\bavk\b/.test(t)) rep.ttt.push('avk');
  if(/lovenox|enoxaparine|innohep|tinzaparine|fragmine|dalteparine|heparine|\bhbpm\b/.test(t)) rep.ttt.push('heparine');
  if(aapNoms.size>=2 || /bitherapie|double anti/.test(t)) rep.ttt.push('aap2');
  else if(aapNoms.size===1 || /antiagregant|antiplaquettaire|\baap\b/.test(t)) rep.ttt.push('aap');
  if(/gliclazide|diamicron|glimepiride|amarel|glibenclamide|daonil/.test(t)) rep.ttt.push('sulfamide');
  if(/methotrexate|novatrex|metoject|imeth/.test(t)) rep.ttt.push('mtx');
  if(/zometa|zoledron|xgeva|(bisphosph|\bbp\b).{0,30}(cancer|metast|myelome)|(cancer|metast|myelome).{0,30}bisphosph/.test(t)) rep.atcd.push('bp_malin');
  else if(/prolia|denosumab/.test(t)) rep.atcd.push(/plus de 6 mois|> ?6 mois/.test(t)?'denosumab_ancien':'denosumab');
  else if(/bisphosph|fosamax|alendron|actonel|risedron|bonviva|ibandron|aclasta/.test(t)) rep.atcd.push(/([5-9]|\d\d) ans|plus de 5 ans|depuis longtemps/.test(t)?'bp_benin5':'bp_benin');
  if(/avastin|bevacizumab|sunitinib|sutent|anti-?angio/.test(t)) rep.atcd.push('antiangio');
  if(/radioth|irradi/.test(t)){ const gy=t.match(/(\d+)\s*gy/); rep.atcd.push(gy && Number(gy[1])<40 ? 'radio_moins40' : 'radio40'); }
  if(/prothese valvul|valve mecanique|valve biologique|\btavi\b|endocardite|cyanogene|assistance ventriculaire/.test(t)) rep.atcd.push('ei_haut');
  else if(/valvulopathie|souffle|pacemaker|stimulateur|defibrillateur|retrecissement aortique|insuffisance mitrale|cardiomyopathie/.test(t)) rep.atcd.push('ei_inter');
  if(/diabet/.test(t)) rep.atcd.push(/desequilibr|mal equilibr|hba1c\s*(de\s*|a\s*)?(9|1\d)/.test(t)?'diabete':'diabete_eq');
  if(/chimio|aplasi/.test(t)) rep.atcd.push('chimio');
  if(/neutropen/.test(t)) rep.atcd.push('neutropenie');
  if(/greff(e|ee)\b.{0,15}(rein|foie|coeur|poumon|organe|moelle)|transplant/.test(t)) rep.atcd.push('greffe');
  if(/cortico|prednisolone|prednisone|solupred|cortancyl/.test(t)) rep.atcd.push('cortico');
  if(/biotherap|immunosupp|immunomodul|humira|adalimumab|enbrel|remicade|infliximab/.test(t)) rep.atcd.push('immunosup');
  if(/\bvih\b|\bsida\b/.test(t)) rep.atcd.push('vih');
  if(/splenectom|asplen/.test(t)) rep.atcd.push('asplenie');
  if(/dialys/.test(t)) rep.atcd.push('ir_severe'); else if(/insuffisan\w* renal/.test(t)) rep.atcd.push(/sever|terminal|dfg ?< ?30/.test(t)?'ir_severe':'ir_moderee');
  if(/cirrhose|insuffisan\w* hepat/.test(t)) rep.atcd.push(/sever|cirrhose/.test(t)?'ih_severe':'ih'); else if(/alcool/.test(t)) rep.atcd.push('ih');
  if(/ulcere|hemorragie digest/.test(t)) rep.atcd.push('ulcere');
  if(/asthm/.test(t)) rep.atcd.push('asthme');
  if(/drepanocyt/.test(t)) rep.atcd.push('drepano');
  if(/qt long/.test(t)) rep.atcd.push('qt');
  if(/insuffisan\w* cardiaque/.test(t)) rep.atcd.push('insuf_card');
  if(/remission/.test(t)) rep.atcd.push('remission'); else if(/cancer|tumeur|lymphome|leucemie/.test(t)) rep.atcd.push('malin');
  if(/prothese (de hanche|de genou|articulaire)/.test(t)) rep.atcd.push('prothese_art');
  const al = (rx) => new RegExp('allerg\\w*.{0,30}('+rx+')').test(t) || new RegExp('('+rx+').{0,15}allerg').test(t);
  if(al('penicill|amox|augmentin|clamoxyl|betalactam|beta-lactam')) rep.allergies.push('peni');
  if(al('cephalo|betalactam|beta-lactam')) rep.allergies.push('cephalo');
  if(al('ains|ibuprof|aspirine|anti-?inflam')) rep.allergies.push('ains');
  if(al('chlorhex|eludril|paroex')) rep.allergies.push('chx');
  if(al('macrolide|azithro|clarithro|zithromax')) rep.allergies.push('macrolides');
  if(al('metronidazole|flagyl')) rep.allergies.push('metro');
  if(al('pristinamycine|pyostacine')) rep.allergies.push('pristina');
  if(al('iode|betadine')) rep.allergies.push('iode');
  if(al('latex')) rep.allergies.push('latex');
  if(al('paracetamol|doliprane')) rep.allergies.push('paracetamol');
  if(/enceinte|grossesse/.test(t)){ rep.profil='enceinte'; if(/(2[4-9]|3\d|4[01])\s*sa|6e mois|[6-9]\s*(e|eme)?\s*mois|troisieme trimestre|3e trimestre/.test(t)) rep.terme='apres'; else if(/\b([1-9]|1\d|2[0-3])\s*sa|\b[1-5]\s*(e|eme)?\s*mois|premier trimestre|1er trimestre/.test(t)) rep.terme='avant'; }
  else if(/allaite|allaitement/.test(t)) rep.profil='allaite';
  const age = t.match(/(\d+)\s*ans/); const kg = t.match(/(\d+[.,]?\d*)\s*kg/);
  if(/enfant|bebe|nourrisson|\bpetit\b|fillette|garcon de/.test(t) || (age && Number(age[1])<15 && !/depuis \d+ ans|\d+ ans de/.test(t))){ rep.profil='enfant'; if(age) rep.age=Number(age[1]); if(kg) rep.poids=kg[1].replace(',','.'); }
  if(/pus|suppur/.test(t) && rep.motif!=='alveolite_suppuree') rep.extension.push('suppuration');
  if(/tumefaction|gonfl|trismus|oedeme/.test(t)) rep.extension.push('tumefaction');
  if(/fievre|ganglion|adenopath|temperature|fievreu/.test(t)) rep.extension.push('fievre');
  if(/(ne peut pas|impossible de|pas pu).{0,30}(drainer|ouvrir|extraire|avulser|faire le geste|trepaner)/.test(t)) rep.extension.push('geste_impossible');
  if(/sans (signe|fievre|pus|tumefaction)|aucun signe/.test(t) && !rep.extension.length) rep.extension=['aucun'];
  const gr=[]; if(/dysphagie|avaler/.test(t)) gr.push('dysphagie'); if(/respir|dyspnee/.test(t)) gr.push('dyspnee'); if(/crepit/.test(t)) gr.push('crepitant'); if(/plancher|\bcou\b|cervical|orbit/.test(t) && rep.motif==='cellulite') gr.push('extension');
  if(gr.length) rep.gravite=gr;
  const imp=[]; if(/plus de 3 implants|[4-9] implants/.test(t)) imp.push('plus3'); if(/immediat/.test(t)) imp.push('immediat'); if(/membrane|\brog\b/.test(t)) imp.push('membrane'); if(imp.length) rep.implant=imp;
  if(/arcade entiere|toute l'arcade|plusieurs secteurs|sinus lift|greffe osseuse|prelevement|kyste de plus de 4|greffe gingivale/.test(t)) rep.risque_hemo='eleve';
  if(!rep.atcd.length) rep.atcd=['aucun']; if(!rep.ttt.length) rep.ttt=['aucun']; if(!rep.allergies.length) rep.allergies=['aucune'];
  return rep;
};

R.resumer = function(rep, O){
  const strip = s => String(s).replace(/<[^>]+>/g,'');
  const parts = [];
  const M = R.MOTIF[rep.motif];
  if(M) parts.push(`Situation : ${M.t}.`);
  if(O.hospit) parts.push('Prise en charge hospitalière indiquée.');
  parts.push(O.atb ? 'Antibiotique : oui.' : 'Antibiotique : non.');
  if(O.pourquoi.length) parts.push(O.pourquoi.map(strip).join(' '));
  if(O.gestes.length) parts.push('Geste : '+O.gestes.map(strip).join(' '));
  if(O.lignes.length) parts.push('Ordonnance proposée : '+O.lignes.map(l=>`${l.med}, ${l.pos}, ${l.qsp}`).join(' ; ')+'.');
  O.alertes.forEach(a=>parts.push(`${a.t} : ${strip(a.d)}`));
  return parts.join('\n');
};

window.RECO = R;
})();
