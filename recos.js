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

/* ---------- Antécédents et traitements ----------
   Chaque option peut porter :
   - eq   : les codes qu'elle active dans le moteur de décision (séparés par des espaces) ;
   - tags : les étiquettes d'interaction du thésaurus ANSM (voir medicaments.js) ;
   - mots : des mots de recherche supplémentaires ;
   - sous : des précisions qui s'ouvrent juste en dessous quand l'option est cochée.
   Une précision est un bloc {k, titre, type:'un'|'multi', requis, mol, options}.
   La réponse est rangée dans rep[k]. Une précision « requis » doit être remplie pour continuer. */
const o = (v, t, d='', x) => Object.assign({v, t, d}, x||{});
const EQUILIBRE = (k, codes, d=['','','']) => ({k, titre:'Équilibre', type:'un', requis:true, options:[
  o('eq','Équilibré', d[0], {eq:codes[0]}), o('non_eq','Non équilibré', d[1], {eq:codes[1]}), o('nsp','Ne sait pas', d[2], {eq:codes[2]})]});
const EQ_DIAB = k => EQUILIBRE(k, ['diabete_eq','diabete','diabete_nsp'], ['HbA1c < 9 %','HbA1c ≥ 9 %','Pas d’HbA1c récente']);
const MOLECULES = (k, liste, titre='Molécule (facultatif)') => ({k, titre, type:'multi', mol:true,
  options: liste.map(([v,t,d,tags,eq]) => o(v, t, d||'', {tags:tags||'', eq:eq||''}))});

R.ATCD = [
  {groupe:'Cœur et vaisseaux', items:[
    o('valve_prot','Prothèse valvulaire ou réparation valvulaire','Valve mécanique ou biologique, TAVI, anneau, clip mitral · haut risque d’endocardite',{eq:'ei_haut', mots:'valve mecanique biologique plastie mitraclip remplacement valvulaire'}),
    o('ei_atcd','Antécédent d’endocardite infectieuse','Haut risque d’endocardite',{eq:'ei_haut'}),
    o('cardio_cong','Cardiopathie congénitale','Opérée ou non',{mots:'malformation cardiaque', sous:[{k:'p_cong', titre:'Type', type:'un', requis:true, options:[
      o('cyano','Cyanogène, non opérée ou avec shunt palliatif','Haut risque d’endocardite',{eq:'ei_haut'}),
      o('mat6','Réparée avec du matériel il y a moins de 6 mois','Chirurgie ou voie percutanée · haut risque',{eq:'ei_haut'}),
      o('residuel','Réparée, avec shunt résiduel ou fuite valvulaire','Haut risque, à vie',{eq:'ei_haut'}),
      o('autre','Autre cardiopathie congénitale','Dont réparée sans résidu depuis plus de 6 mois · risque intermédiaire',{eq:'ei_inter'}),
      o('nsp','Ne sait pas','À demander au cardiologue',{eq:'cong_nsp'}),
    ]}]}),
    o('assist_vent','Assistance ventriculaire','Haut risque d’endocardite',{eq:'ei_haut'}),
    o('valvulo','Valvulopathie native','Rétrécissement ou fuite valvulaire, bicuspidie aortique, prolapsus mitral, rhumatisme articulaire aigu · risque intermédiaire',{eq:'ei_inter', mots:'souffle insuffisance mitrale aortique retrecissement'}),
    o('cmh','Cardiomyopathie hypertrophique obstructive','Risque intermédiaire d’endocardite',{eq:'ei_inter'}),
    o('pacemaker','Stimulateur cardiaque ou défibrillateur implantable','Pacemaker, défibrillateur avec sonde · risque intermédiaire',{eq:'ei_inter', mots:'pace maker pile'}),
    o('hypertension','Hypertension artérielle','',{mots:'hta tension', sous:[EQUILIBRE('eq_hta',['hta_eq','hta','hta'])]}),
    o('coronarien','Maladie coronarienne','Angor, infarctus, stent, pontage',{mots:'angine de poitrine coronaropathie infarctus stent pontage', sous:[{k:'p_coro', titre:'Précisions (facultatif)', type:'multi', options:[
      o('stent_recent','Stent coronaire posé il y a moins de 12 mois','Bithérapie antiplaquettaire probable'),
      o('stent_ancien','Stent coronaire posé il y a plus de 12 mois'),
      o('pontage','Pontage coronarien'),
      o('idm_recent','Infarctus récent ou angor instable','Douleurs au repos ou qui s’aggravent'),
    ]}]}),
    o('rythme','Trouble du rythme ou de la conduction','Fibrillation atriale, flutter, bloc auriculo-ventriculaire…',{mots:'arythmie'}),
    o('insuf_card','Insuffisance cardiaque',''),
    o('arteres','Artériopathie ou anévrisme','Artériopathie des membres inférieurs, anévrisme de l’aorte',{mots:'aomi', sous:[{k:'p_art', titre:'Chirurgie (facultatif)', type:'multi', options:[
      o('prothese_vasc','Pontage ou prothèse vasculaire'), o('endoprothese','Endoprothèse aortique')]}]}),
    o('thrombose','Phlébite ou embolie pulmonaire','Thrombose veineuse profonde',{mots:'tvp'}),
    o('qt','QT long','Congénital, ou médicament qui allonge le QT'),
  ]},
  {groupe:'Diabète et hormones', items:[
    o('dt1','Diabète de type 1','',{mots:'diabete insulinodependant', sous:[EQ_DIAB('eq_dt1')]}),
    o('dt2','Diabète de type 2','',{mots:'diabete', sous:[EQ_DIAB('eq_dt2')]}),
    o('diab_autre','Autre diabète','Gestationnel, cortico-induit, pancréatique, MODY',{mots:'diabete', sous:[EQ_DIAB('eq_diab_autre')]}),
    o('hypothyro','Hypothyroïdie','Hashimoto, thyroïde retirée…',{mots:'thyroide', sous:[EQUILIBRE('eq_hypothyro',['','hypothyro_ne','hypothyro_ne'])]}),
    o('hyperthyro','Hyperthyroïdie','Maladie de Basedow, nodule toxique',{mots:'thyroide', sous:[EQUILIBRE('eq_hyperthyro',['','hyperthyro_ne','hyperthyro_ne'])]}),
    o('surrenal','Insuffisance surrénalienne','Maladie d’Addison, corticothérapie prolongée',{mots:'addison'}),
    o('obesite','Obésité','',{sous:[{k:'p_bari', titre:'Chirurgie bariatrique (facultatif)', type:'un', options:[
      o('bypass','Bypass gastrique'), o('sleeve','Sleeve gastrectomie'), o('anneau','Anneau gastrique')]}]}),
  ]},
  {groupe:'Maladies inflammatoires et auto-immunes', items:[
    o('mici','Maladie inflammatoire chronique de l’intestin (MICI)','',{mots:'crohn rectocolite rch', sous:[{k:'p_mici', titre:'Type (facultatif)', type:'un', options:[
      o('crohn','Maladie de Crohn'), o('rch','Rectocolite hémorragique'), o('indet','Colite indéterminée')]}]}),
    o('pr','Polyarthrite rhumatoïde','',{mots:'rhumatisme inflammatoire'}),
    o('spa','Spondyloarthrite','Spondylarthrite ankylosante, rhumatisme psoriasique',{mots:'spondylarthrite pelvispondylite'}),
    o('lupus','Lupus érythémateux systémique',''),
    o('sjogren','Syndrome de Gougerot-Sjögren','Sécheresse buccale et oculaire',{mots:'sjogren secheresse'}),
    o('sclerodermie','Sclérodermie systémique',''),
    o('psoriasis','Psoriasis',''),
    o('behcet','Maladie de Behçet','Aphtose buccale et génitale',{mots:'behcet'}),
    o('vascularite','Vascularite','Maladie de Horton, granulomatose avec polyangéite…',{mots:'horton wegener'}),
    o('bulleuse','Pemphigus ou pemphigoïde','Maladie bulleuse auto-immune'),
    o('lichen','Lichen plan buccal',''),
    o('celiaque','Maladie cœliaque','',{mots:'gluten'}),
  ]},
  {groupe:'Sang et hémostase', items:[
    o('hemophilie','Hémophilie A ou B','Déficit en facteur VIII ou IX, quelle que soit la sévérité'),
    o('willebrand','Maladie de Willebrand',''),
    o('deficit_facteur','Autre déficit en facteur de la coagulation','Facteurs II, V, VII, X, XI, fibrinogène…'),
    o('thrombopenie','Thrombopénie ou thrombopathie','Plaquettes basses (PTI, hémopathie, chimiothérapie, cirrhose…) ou anomalie de fonction plaquettaire'),
    o('anemie','Anémie','Carence en fer, en vitamine B12 ou en folates'),
    o('drepano','Drépanocytose','Syndrome drépanocytaire majeur'),
    o('neutropenie','Neutropénie < 500/mm³',''),
  ]},
  {groupe:'Immunité et infections', items:[
    o('greffe','Greffe d’organe ou de moelle','Traitement anti-rejet',{mots:'transplantation', sous:[{k:'p_greffe', titre:'Organe (facultatif)', type:'multi', options:[
      o('rein','Rein'), o('foie','Foie'), o('coeur','Cœur'), o('poumon','Poumon'), o('moelle','Moelle osseuse (allogreffe)')]}]}),
    o('vih_p','Infection par le VIH','',{mots:'vih sida', sous:[{k:'p_vih', titre:'Derniers CD4', type:'un', requis:true, options:[
      o('ok','200/mm³ ou plus'), o('bas','Moins de 200/mm³','',{eq:'vih'}), o('nsp','Ne sait pas','',{eq:'vih_nsp'})]}]}),
    o('splenectomie','Asplénie ou rate retirée','Splénectomie, asplénie fonctionnelle',{mots:'rate asplenie', sous:[{k:'p_asplenie', titre:'Depuis', type:'un', requis:true, options:[
      o('recent','Moins de 5 ans','',{eq:'asplenie'}), o('ancien','5 ans ou plus'), o('nsp','Ne sait pas','',{eq:'asplenie_nsp'})]}]}),
    o('deficit','Déficit immunitaire congénital ou du complément',''),
    o('hepatite','Hépatite virale B ou C','',{mots:'vhb vhc'}),
    o('tuberculose','Tuberculose','',{sous:[{k:'p_tuberc', titre:'Situation', type:'un', requis:true, options:[
      o('active','Active ou en cours de traitement'), o('ancienne','Ancienne, traitée')]}]}),
  ]},
  {groupe:'Cancer', items:[
    o('cancer','Cancer ou hémopathie maligne','Tumeur, leucémie, lymphome, myélome',{mots:'tumeur', sous:[
      {k:'p_k_etat', titre:'Situation', type:'un', requis:true, options:[
        o('en_cours','En cours de traitement','Chirurgie, chimiothérapie, radiothérapie, hormonothérapie…',{eq:'malin'}),
        o('remission','En rémission','',{eq:'remission'})]},
      {k:'p_k_type', titre:'Localisation (facultatif)', type:'multi', options:[
        o('vads','Bouche, gorge ou larynx (VADS)'), o('sein','Sein'), o('prostate','Prostate'), o('poumon','Poumon'), o('digestif','Côlon, rectum ou autre digestif'),
        o('rein_vessie','Rein ou vessie'), o('myelome','Myélome'), o('leucemie','Leucémie'), o('lymphome','Lymphome'), o('autre','Autre')]},
    ]}),
    o('onm_atcd','Antécédent d’ostéonécrose des mâchoires','Médicamenteuse ou ostéoradionécrose',{mots:'osteoradionecrose'}),
  ]},
  {groupe:'Reins, foie, digestif', items:[
    o('ir','Insuffisance rénale chronique','',{mots:'renale dfg dialyse rein', sous:[{k:'p_ir', titre:'Stade', type:'un', requis:true, options:[
      o('moderee','Modérée','DFG 30 à 59 mL/min',{eq:'ir_moderee'}), o('severe','Sévère','DFG < 30 mL/min',{eq:'ir_severe'}),
      o('dialyse','Dialyse','',{eq:'ir_severe dialyse'}), o('nsp','Ne sait pas','',{eq:'ir_moderee'})]}]}),
    o('hepatique','Insuffisance hépatique ou cirrhose','',{mots:'foie', sous:[{k:'p_ih', titre:'Gravité', type:'un', requis:true, options:[
      o('moderee','Modérée','',{eq:'ih'}), o('severe','Sévère','TP ≤ 50 %',{eq:'ih_severe'}), o('nsp','Ne sait pas','',{eq:'ih'})]}]}),
    o('alcool','Alcoolisme chronique','',{eq:'ih', tags:'alcool'}),
    o('ulcere','Ulcère gastro-duodénal ou hémorragie digestive',''),
    o('rgo','Reflux gastro-œsophagien','',{mots:'rgo'}),
  ]},
  {groupe:'Poumons', items:[
    o('asthme','Asthme','',{sous:[{k:'p_asthme', titre:'Aspirine et AINS (facultatif)', type:'un', options:[
      o('declenche','Crise déclenchée par l’aspirine ou un AINS','',{eq:'asthme_ains'}), o('tolere','AINS déjà pris sans problème','',{eq:'asthme_tolere'}), o('nsp','Ne sait pas')]}]}),
    o('bpco','BPCO ou insuffisance respiratoire','Bronchite chronique, emphysème'),
    o('saos','Apnée du sommeil','',{mots:'saos'}),
  ]},
  {groupe:'Neurologie et psychiatrie', items:[
    o('epilepsie','Épilepsie','',{sous:[EQUILIBRE('eq_epi',['','epi_ne','epi_ne'],['Pas de crise sous traitement','Crises récentes',''])]}),
    o('avc','AVC ou AIT','Accident vasculaire cérébral, accident ischémique transitoire'),
    o('parkinson','Maladie de Parkinson',''),
    o('sep','Sclérose en plaques',''),
    o('demence','Maladie d’Alzheimer ou troubles cognitifs','',{mots:'alzheimer'}),
    o('psy','Trouble psychiatrique','Dépression, anxiété, trouble bipolaire, schizophrénie…',{sous:[{k:'p_psy', titre:'Type (facultatif)', type:'multi', options:[
      o('depression','Dépression'), o('anxiete','Trouble anxieux, phobie des soins'), o('bipolaire','Trouble bipolaire'), o('psychose','Schizophrénie ou trouble psychotique'),
      o('tca','Anorexie ou boulimie'), o('addiction','Addiction','Opiacés, cannabis, cocaïne…')]}]}),
    o('handicap','Handicap ou trouble du neurodéveloppement','Autisme, trisomie 21, paralysie cérébrale…'),
  ]},
  {groupe:'Os et articulations', items:[
    o('osteoporose','Ostéoporose','Son traitement se coche à la question suivante'),
    o('paget','Maladie de Paget osseuse',''),
    o('prothese_art','Prothèse articulaire','Hanche, genou, épaule'),
  ]},
  {groupe:'Autres', items:[
    o('tabac','Tabagisme',''),
    o('glaucome','Glaucome à angle fermé',''),
    o('prostate','Troubles urétro-prostatiques','Risque de rétention urinaire'),
    o('porphyrie','Porphyrie aiguë intermittente','Contre-indique l’articaïne'),
    o('aucun','Aucun antécédent notable',''),
  ]},
];
R.RIA = ['chimio','neutropenie','immunosup','cortico','greffe','vih','deficit','asplenie','diabete','ir_severe','ih_severe','drepano'];
R.HRON = ['radio40','denosumab','bp_malin','antiangio','bp_benin5','deno_malin','bp_nsp','onm_atcd'];
/* Réponses « ne sait pas » qui feraient basculer le patient dans le risque infectieux augmenté */
R.A_VERIFIER = {
  diabete_nsp:'l’HbA1c est de 9 % ou plus',
  cortico_nsp:'la corticothérapie atteint 10 mg/j d’équivalent prednisolone depuis plus de 2 semaines',
  chimio_nsp:'la chimiothérapie est aplasiante',
  vih_nsp:'les CD4 sont sous 200/mm³',
  asplenie_nsp:'l’asplénie date de moins de 5 ans',
};

R.TTT = [
  {groupe:'Antithrombotiques', items:[
    o('antiplaq','Antiplaquettaires','Kardégic, Plavix, Brilique, Efient…',{tags:'aap', mots:'antiagregant aspirine', sous:[
      {k:'p_aap', titre:'Combien ?', type:'un', requis:true, options:[o('mono','Un seul antiplaquettaire','',{eq:'aap'}), o('bi','Deux (bithérapie)','',{eq:'aap2'})]},
      MOLECULES('m_aap',[
        ['aspirine','Aspirine','Kardégic, Résitune','aap aspirine'],
        ['clopidogrel','Clopidogrel','Plavix','aap'],
        ['duoplavin','Clopidogrel + aspirine','Duoplavin','aap aap_double aspirine'],
        ['prasugrel','Prasugrel','Efient','aap'],
        ['ticagrelor','Ticagrélor','Brilique','aap ticagrelor'],
        ['asasantine','Dipyridamole + aspirine','Asasantine','aap aspirine']])]}),
    o('avk','Antivitamines K (AVK)','Coumadine, Préviscan, Sintrom',{tags:'avk anticoag', mots:'anticoagulant', sous:[MOLECULES('m_avk',[
      ['warfarine','Warfarine','Coumadine','avk anticoag'],['fluindione','Fluindione','Préviscan','avk anticoag'],['acenocoumarol','Acénocoumarol','Sintrom, Minisintrom','avk anticoag']])]}),
    o('aod','Anticoagulants oraux directs (AOD)','Eliquis, Xarelto, Pradaxa, Lixiana',{tags:'aod anticoag', mots:'anticoagulant naco', sous:[MOLECULES('m_aod',[
      ['apixaban','Apixaban','Eliquis','aod anticoag'],['rivaroxaban','Rivaroxaban','Xarelto','aod anticoag'],['dabigatran','Dabigatran','Pradaxa','aod anticoag'],['edoxaban','Édoxaban','Lixiana','aod anticoag']])]}),
    o('heparine','Héparines et anticoagulants injectables','Lovenox, Innohep, Arixtra…',{tags:'heparine', mots:'anticoagulant hbpm', sous:[MOLECULES('m_hep',[
      ['enoxaparine','Énoxaparine','Lovenox','heparine'],['tinzaparine','Tinzaparine','Innohep','heparine'],['dalteparine','Daltéparine','Fragmine','heparine'],
      ['nadroparine','Nadroparine','Fraxiparine','heparine'],['fondaparinux','Fondaparinux','Arixtra','heparine'],['hnf','Héparine non fractionnée','Calciparine, héparine sodique','heparine']])]}),
  ]},
  {groupe:'Cœur et tension', items:[
    o('iec','IEC','Ramipril, périndopril, énalapril…',{tags:'iec antihta', mots:'inhibiteur enzyme conversion tension hypertension', sous:[MOLECULES('m_iec',[
      ['ramipril','Ramipril','Triatec','iec antihta'],['perindopril','Périndopril','Coversyl','iec antihta'],['enalapril','Énalapril','Rénitec','iec antihta'],['lisinopril','Lisinopril','Zestril','iec antihta'],
      ['captopril','Captopril','Lopril','iec antihta'],['trandolapril','Trandolapril','Odrik','iec antihta'],['benazepril','Bénazépril','Cibacène','iec antihta']])]}),
    o('ara2','Sartans (ARA II)','Losartan, valsartan, irbésartan…',{tags:'ara2 antihta', mots:'antagoniste angiotensine tension hypertension', sous:[MOLECULES('m_ara2',[
      ['losartan','Losartan','Cozaar','ara2 antihta'],['valsartan','Valsartan','Tareg, Nisis','ara2 antihta'],['irbesartan','Irbésartan','Aprovel','ara2 antihta'],['candesartan','Candésartan','Atacand, Kenzen','ara2 antihta'],
      ['olmesartan','Olmésartan','Alteis, Olmetec','ara2 antihta'],['telmisartan','Telmisartan','Micardis','ara2 antihta'],['entresto','Sacubitril + valsartan','Entresto','ara2 ic']])]}),
    o('diuretique','Diurétiques','Furosémide, indapamide, spironolactone…',{tags:'diuretique antihta', mots:'tension hypertension', sous:[MOLECULES('m_diur',[
      ['furosemide','Furosémide','Lasilix','diuretique antihta'],['bumetanide','Bumétanide','Burinex','diuretique antihta'],['hydrochlorothiazide','Hydrochlorothiazide','Esidrex, associations','diuretique antihta'],
      ['indapamide','Indapamide','Fludex','diuretique antihta'],['spironolactone','Spironolactone','Aldactone','diuretique antihta'],['eplerenone','Éplérénone','Inspra','diuretique eplerenone ic']])]}),
    o('betabloquant','Bêtabloquants','Bisoprolol, aténolol, propranolol…',{tags:'betabloquant antihta', mots:'tension hypertension', sous:[MOLECULES('m_bb',[
      ['bisoprolol','Bisoprolol','Cardensiel, Détensiel','betabloquant antihta'],['nebivolol','Nébivolol','Temerit','betabloquant antihta'],['atenolol','Aténolol','Ténormine','betabloquant antihta'],
      ['metoprolol','Métoprolol','Lopressor, Seloken','betabloquant antihta'],['acebutolol','Acébutolol','Sectral','betabloquant antihta'],['propranolol','Propranolol','Avlocardyl','betabloquant antihta bb_ns'],
      ['carvedilol','Carvédilol','Kredex','betabloquant antihta bb_ns'],['nadolol','Nadolol','Corgard','betabloquant antihta bb_ns'],['sotalol','Sotalol','Sotalex','betabloquant antiarythmique qt bb_ns']])]}),
    o('ica','Inhibiteurs calciques','Amlodipine, diltiazem, vérapamil…',{tags:'ica antihta hyperplasie', mots:'tension hypertension', sous:[MOLECULES('m_ica',[
      ['amlodipine','Amlodipine','Amlor','ica antihta hyperplasie'],['nifedipine','Nifédipine','Adalate','ica antihta hyperplasie'],['felodipine','Félodipine','Flodil','ica antihta hyperplasie'],
      ['nicardipine','Nicardipine','Loxen','ica antihta hyperplasie'],['lercanidipine','Lercanidipine','Zanidip','lercanidipine antihta hyperplasie'],['diltiazem','Diltiazem','Tildiem','ica antihta hyperplasie'],
      ['verapamil','Vérapamil','Isoptine','verapamil antihta hyperplasie']])]}),
    o('antihta_c','Autres antihypertenseurs','Clonidine, rilménidine, urapidil…',{tags:'antihta', mots:'tension hypertension', sous:[MOLECULES('m_ahc',[
      ['clonidine','Clonidine','Catapressan','antihta xerostomie'],['rilmenidine','Rilménidine','Hyperium','antihta'],['moxonidine','Moxonidine','Physiotens','antihta'],['urapidil','Urapidil','Eupressyl','antihta'],['methyldopa','Méthyldopa','Aldomet','antihta']])]}),
    o('antiarythmique','Antiarythmiques et digoxine','Amiodarone, flécaïnide, digoxine…',{tags:'antiarythmique', sous:[MOLECULES('m_aa',[
      ['amiodarone','Amiodarone','Cordarone','antiarythmique qt amiodarone'],['dronedarone','Dronédarone','Multaq','antiarythmique dronedarone'],['flecainide','Flécaïnide','Flécaïne','antiarythmique'],
      ['propafenone','Propafénone','Rythmol','antiarythmique'],['hydroquinidine','Hydroquinidine','Sérécor','antiarythmique qt'],['digoxine','Digoxine','Hémigoxine','digoxine']])]}),
    o('antiangor','Anti-angoreux et dérivés nitrés','Trinitrine, nicorandil, ivabradine…',{tags:'angor', sous:[MOLECULES('m_angor',[
      ['trinitrine','Trinitrine','Natispray, patchs','angor'],['isosorbide','Isosorbide dinitrate','Risordan','angor'],['molsidomine','Molsidomine','Corvasal','angor'],
      ['nicorandil','Nicorandil','Adancor, Ikorel','nicorandil angor'],['ivabradine','Ivabradine','Procoralan','ivabradine'],['ranolazine','Ranolazine','Ranexa','ranolazine angor']])]}),
    o('hypolip','Hypolipémiants','Statines, ézétimibe, fibrates',{tags:'statine', mots:'cholesterol', sous:[MOLECULES('m_lip',[
      ['simvastatine','Simvastatine','Zocor, Inegy','simva statine'],['atorvastatine','Atorvastatine','Tahor','atorva statine'],['pravastatine','Pravastatine','Elisor, Vasten','prava statine'],
      ['rosuvastatine','Rosuvastatine','Crestor','statine'],['fluvastatine','Fluvastatine','Lescol','statine'],['ezetimibe','Ézétimibe','Ezetrol',''],['fenofibrate','Fénofibrate','Lipanthyl','fibrate']])]}),
  ]},
  {groupe:'Diabète et hormones', items:[
    o('antidiab','Antidiabétiques','Metformine, gliclazide, gliptines, Ozempic…',{tags:'antidiab', mots:'diabete', sous:[MOLECULES('m_antidiab',[
      ['metformine','Metformine','Glucophage, Stagid, associations','antidiab metformine'],
      ['gliclazide','Gliclazide','Diamicron · sulfamide','antidiab sulfamide','sulfamide'],
      ['glimepiride','Glimépiride','Amarel · sulfamide','antidiab sulfamide','sulfamide'],
      ['glibenclamide','Glibenclamide','Daonil, Glucovance · sulfamide','antidiab sulfamide','sulfamide'],
      ['glipizide','Glipizide','Glibénèse, Ozidia · sulfamide','antidiab sulfamide','sulfamide'],
      ['repaglinide','Répaglinide','Novonorm','antidiab repaglinide'],
      ['sitagliptine','Sitagliptine','Januvia, Xelevia, Janumet','antidiab'],
      ['vildagliptine','Vildagliptine','Galvus, Eucreas','antidiab'],
      ['saxagliptine','Saxagliptine','Onglyza','antidiab'],
      ['linagliptine','Linagliptine','Trajenta','antidiab'],
      ['dapagliflozine','Dapagliflozine','Forxiga, Xigduo','antidiab gliflozine'],
      ['empagliflozine','Empagliflozine','Jardiance, Synjardy','antidiab gliflozine'],
      ['semaglutide','Sémaglutide','Ozempic, Rybelsus, Wegovy','antidiab glp1'],
      ['dulaglutide','Dulaglutide','Trulicity','antidiab glp1'],
      ['liraglutide','Liraglutide','Victoza, Saxenda','antidiab glp1'],
      ['tirzepatide','Tirzépatide','Mounjaro','antidiab glp1'],
      ['exenatide','Exénatide','Byetta, Bydureon','antidiab glp1'],
      ['acarbose','Acarbose','Glucor','antidiab']])]}),
    o('insuline','Insulines','Lantus, Novorapid, pompe…',{tags:'antidiab insuline', mots:'diabete', sous:[MOLECULES('m_ins',[
      ['ins_lente','Insuline lente','Lantus, Toujeo, Tresiba, Abasaglar','antidiab insuline'],['ins_rapide','Insuline rapide','Novorapid, Humalog, Fiasp, Apidra','antidiab insuline'],
      ['ins_mixte','Insuline mixte','Novomix, Humalog Mix','antidiab insuline'],['pompe','Pompe à insuline','','antidiab insuline']], 'Type (facultatif)')]}),
    o('thyroide','Traitements de la thyroïde','Levothyrox, Néomercazole…',{sous:[MOLECULES('m_thyr',[
      ['levothyroxine','Lévothyroxine','Levothyrox, L-Thyroxine',''],['liothyronine','Liothyronine','Cynomel',''],['carbimazole','Carbimazole','Néomercazole','antithyro'],
      ['thiamazole','Thiamazole','Thyrozol','antithyro'],['ptu','Propylthiouracile','Proracyl','antithyro']])]}),
    o('cortico_c','Corticoïdes par voie orale','Cortancyl, Solupred, Médrol…',{tags:'cortico_os', mots:'corticoide corticotherapie', sous:[
      {k:'p_cortico', titre:'Dose et durée', type:'un', requis:true, options:[
        o('fort','10 mg/j ou plus depuis plus de 2 semaines','En équivalent prednisolone',{eq:'cortico'}),
        o('faible','Moins de 10 mg/j, ou depuis moins de 2 semaines','',{eq:'cortico_faible'}),
        o('nsp','Ne sait pas','',{eq:'cortico_nsp'})]},
      MOLECULES('m_cortico',[['prednisone','Prednisone','Cortancyl','cortico_os'],['prednisolone','Prednisolone','Solupred','cortico_os'],['methylprednisolone','Méthylprednisolone','Médrol','cortico_os'],
        ['dexamethasone','Dexaméthasone','Dectancyl, Néofordex','cortico_os'],['betamethasone','Bétaméthasone','Célestène','cortico_os'],['hydrocortisone','Hydrocortisone','Substitution surrénalienne','hydrocortisone']])]}),
  ]},
  {groupe:'Immunité et inflammation', items:[
    o('mtx','Méthotrexate','Novatrex, Metoject, Imeth, Nordimet',{tags:'mtx immunosup ulcerations', eq:'immunosup'}),
    o('immunosup','Immunosuppresseurs et inhibiteurs de JAK','Imurel, Cellcept, Arava, Néoral, Prograf, Xeljanz…',{tags:'immunosup', sous:[MOLECULES('m_is',[
      ['azathioprine','Azathioprine','Imurel','immunosup'],['mycophenolate','Mycophénolate','Cellcept, Myfortic','immunosup mycophenolate'],['leflunomide','Léflunomide','Arava','immunosup'],
      ['ciclosporine','Ciclosporine','Néoral, Sandimmun','antirejet is_cyp immunosup ciclosporine hyperplasie'],['tacrolimus','Tacrolimus','Prograf, Advagraf','antirejet is_cyp immunosup tacrolimus'],
      ['sirolimus','Sirolimus','Rapamune','antirejet is_cyp immunosup'],['everolimus','Évérolimus','Certican','antirejet is_cyp immunosup'],
      ['tofacitinib','Tofacitinib','Xeljanz','immunosup'],['baricitinib','Baricitinib','Olumiant','immunosup'],['upadacitinib','Upadacitinib','Rinvoq','immunosup'],['filgotinib','Filgotinib','Jyseleca','immunosup']])]}),
    o('biotherapie','Biothérapies','Humira, Enbrel, Rémicade, Stelara, Cosentyx…',{tags:'immunosup', eq:'immunosup', mots:'anti tnf anticorps', sous:[MOLECULES('m_bio',[
      ['adalimumab','Adalimumab','Humira et biosimilaires','immunosup'],['etanercept','Étanercept','Enbrel, Benepali','immunosup'],['infliximab','Infliximab','Rémicade, Inflectra','immunosup'],
      ['certolizumab','Certolizumab','Cimzia','immunosup'],['golimumab','Golimumab','Simponi','immunosup'],['tocilizumab','Tocilizumab','RoActemra','immunosup'],['abatacept','Abatacept','Orencia','immunosup'],
      ['rituximab','Rituximab','Mabthera, Truxima','immunosup'],['ustekinumab','Ustékinumab','Stelara','immunosup'],['secukinumab','Sécukinumab','Cosentyx','immunosup'],['ixekizumab','Ixékizumab','Taltz','immunosup'],
      ['guselkumab','Guselkumab','Tremfya','immunosup'],['risankizumab','Risankizumab','Skyrizi','immunosup'],['vedolizumab','Védolizumab','Entyvio','immunosup'],['natalizumab','Natalizumab','Tysabri','immunosup'],
      ['ocrelizumab','Ocrélizumab','Ocrevus','immunosup']])]}),
    o('fond','Autres traitements de fond','Plaquenil, Salazopyrine, Pentasa…',{sous:[MOLECULES('m_fond',[
      ['hydroxychloroquine','Hydroxychloroquine','Plaquenil','qt'],['sulfasalazine','Sulfasalazine','Salazopyrine',''],['mesalazine','Mésalazine','Pentasa, Fivasa',''],['apremilast','Aprémilast','Otezla',''],
      ['interferon','Interféron bêta ou glatiramère','Dans la sclérose en plaques','']])]}),
    o('ains_c','Anti-inflammatoires (AINS) au long cours','Ibuprofène, kétoprofène, célécoxib…',{tags:'ains', sous:[MOLECULES('m_ains',[
      ['ibuprofene','Ibuprofène','Advil, Nurofen','ains'],['ketoprofene','Kétoprofène','Profénid','ains'],['naproxene','Naproxène','Apranax','ains'],['diclofenac','Diclofénac','Voltarène','ains'],
      ['celecoxib','Célécoxib','Celebrex','ains'],['etoricoxib','Étoricoxib','Arcoxia','ains'],['piroxicam','Piroxicam','Feldène','ains'],['meloxicam','Méloxicam','Mobic','ains'],
      ['aspirine_forte','Aspirine à dose antalgique','500 mg ou plus','ains aspirine_forte']])]}),
    o('goutte','Traitements de la goutte','Colchicine, allopurinol, fébuxostat',{sous:[MOLECULES('m_goutte',[
      ['colchicine','Colchicine','Colchimax','colchicine'],['allopurinol','Allopurinol','Zyloric','allopurinol'],['febuxostat','Fébuxostat','Adenuric','']])]}),
  ]},
  {groupe:'Os', items:[
    o('bisphos','Bisphosphonates','Fosamax, Actonel, Bonviva, Aclasta, Zometa…',{mots:'biphosphonate osteoporose', sous:[
      {k:'p_bp', titre:'Indication et durée', type:'un', requis:true, options:[
        o('malin','Pour un cancer','Métastases osseuses, myélome',{eq:'bp_malin'}),
        o('benin5','Ostéoporose ou Paget, 5 ans cumulés ou plus','',{eq:'bp_benin5'}),
        o('benin','Ostéoporose ou Paget, moins de 5 ans','',{eq:'bp_benin'}),
        o('nsp','Ne sait pas','Considéré à haut risque par prudence',{eq:'bp_nsp'})]},
      MOLECULES('m_bp',[['alendronate','Alendronate','Fosamax, Fosavance',''],['risedronate','Risédronate','Actonel',''],['ibandronate','Ibandronate','Bonviva',''],
        ['zoledronate','Zolédronate','Aclasta (ostéoporose), Zometa (cancer)',''],['pamidronate','Pamidronate','Pour un cancer',''],['clodronate','Clodronate','Clastoban','']])]}),
    o('denosumab_c','Dénosumab','Prolia, Xgeva',{sous:[{k:'p_deno', titre:'Indication et dernière injection', type:'un', requis:true, options:[
      o('malin','Xgeva, pour un cancer','',{eq:'deno_malin'}),
      o('recent','Prolia, dernière injection il y a moins de 6 mois','',{eq:'denosumab'}),
      o('ancien','Prolia, dernière injection il y a plus de 6 mois','',{eq:'denosumab_ancien'}),
      o('nsp','Ne sait pas','Considéré à haut risque par prudence',{eq:'denosumab deno_nsp'})]}]}),
    o('osteo_autre','Autres traitements de l’ostéoporose','Evenity, Forsteo, raloxifène',{sous:[MOLECULES('m_osteo',[
      ['romosozumab','Romosozumab','Evenity','romosozumab'],['teriparatide','Tériparatide','Forsteo, Movymia',''],['raloxifene','Raloxifène','Evista, Optruma','']])]}),
  ]},
  {groupe:'Poumons et allergies', items:[
    o('respi','Bronchodilatateurs et antiasthmatiques','Ventoline, Spiriva, Singulair…',{tags:'respi', mots:'asthme bpco', sous:[MOLECULES('m_respi',[
      ['salbutamol','Salbutamol','Ventoline, Airomir','respi'],['terbutaline','Terbutaline','Bricanyl','respi'],['formoterol','Formotérol ou salmétérol','Foradil, Serevent','respi'],
      ['tiotropium','Tiotropium','Spiriva','respi xerostomie'],['montelukast','Montélukast','Singulair','respi'],['theophylline','Théophylline','Théostat','theophylline']])]}),
    o('cortico_inh','Corticoïdes inhalés','Symbicort, Seretide, Flixotide, Qvar…',{tags:'cortico_inh', mots:'asthme bpco', sous:[MOLECULES('m_ci',[
      ['budesonide','Budésonide','Pulmicort, Symbicort','cortico_inh cortico_inh_metab'],['fluticasone','Fluticasone','Flixotide, Seretide, Relvar','cortico_inh cortico_inh_metab'],
      ['beclometasone','Béclométasone','Qvar, Innovair, Formodual','cortico_inh']])]}),
    o('antihist','Antihistaminiques','Cétirizine, Aerius, Atarax…',{mots:'allergie', sous:[MOLECULES('m_ah',[
      ['cetirizine','Cétirizine','Zyrtec, Virlix','xerostomie'],['desloratadine','Desloratadine','Aerius',''],['bilastine','Bilastine','Inorial',''],
      ['hydroxyzine','Hydroxyzine','Atarax','qt xerostomie'],['mequitazine','Méquitazine','Primalan','qt xerostomie']])]}),
  ]},
  {groupe:'Système nerveux et psychiatrie', items:[
    o('antidep','Antidépresseurs','Sertraline, Deroxat, Effexor, Laroxyl…',{tags:'xerostomie', sous:[MOLECULES('m_ad',[
      ['sertraline','Sertraline','Zoloft · ISRS','isrs xerostomie'],['fluoxetine','Fluoxétine','Prozac · ISRS','isrs cyp2d6 xerostomie'],['paroxetine','Paroxétine','Deroxat · ISRS','isrs cyp2d6 xerostomie'],
      ['citalopram','Citalopram','Seropram · ISRS','isrs qt xerostomie'],['escitalopram','Escitalopram','Seroplex · ISRS','isrs qt xerostomie'],['fluvoxamine','Fluvoxamine','Floxyfral · ISRS','isrs fluvoxamine xerostomie'],
      ['venlafaxine','Venlafaxine','Effexor · IRSNA','irsna venlafaxine xerostomie'],['duloxetine','Duloxétine','Cymbalta · IRSNA','irsna cyp2d6 xerostomie'],['milnacipran','Milnacipran','Ixel · IRSNA','irsna xerostomie'],
      ['amitriptyline','Amitriptyline','Laroxyl · tricyclique','tricyclique xerostomie'],['clomipramine','Clomipramine','Anafranil · tricyclique','tricyclique xerostomie'],['imipramine','Imipramine','Tofranil · tricyclique','tricyclique xerostomie'],
      ['mirtazapine','Mirtazapine','Norset','xerostomie'],['mianserine','Miansérine','','xerostomie'],['agomelatine','Agomélatine','Valdoxan',''],['vortioxetine','Vortioxétine','Brintellix',''],
      ['moclobemide','Moclobémide','Moclamine · IMAO-A','imao_a'],['iproniazide','Iproniazide','Marsilid · IMAO','imao']])]}),
    o('thymo','Thymorégulateurs','Lithium, Dépakote…',{mots:'bipolaire', sous:[MOLECULES('m_thymo',[
      ['lithium','Lithium','Téralithe','lithium'],['divalproate','Divalproate ou valpromide','Dépakote, Dépamide','antiepi valproate'],['lamotrigine_t','Lamotrigine','Lamictal','antiepi']])]}),
    o('antipsy','Antipsychotiques','Abilify, Zyprexa, Risperdal, Tercian…',{tags:'xerostomie', mots:'neuroleptique', sous:[MOLECULES('m_ap',[
      ['aripiprazole','Aripiprazole','Abilify',''],['olanzapine','Olanzapine','Zyprexa','xerostomie'],['risperidone','Rispéridone','Risperdal','xerostomie'],['quetiapine','Quétiapine','Xeroquel','quetiapine xerostomie'],
      ['clozapine','Clozapine','Leponex','clozapine'],['haloperidol','Halopéridol','Haldol','qt xerostomie'],['amisulpride','Amisulpride','Solian','qt xerostomie'],['cyamemazine','Cyamémazine','Tercian','qt xerostomie'],
      ['levomepromazine','Lévomépromazine','Nozinan','qt xerostomie'],['loxapine','Loxapine','Loxapac','xerostomie'],['pimozide','Pimozide','Orap','pimozide qt'],['lurasidone','Lurasidone','','lurasidone']])]}),
    o('benzo','Anxiolytiques et somnifères','Xanax, Lexomil, Stilnox…',{tags:'benzo', mots:'benzodiazepine hypnotique', sous:[MOLECULES('m_bz',[
      ['alprazolam','Alprazolam','Xanax','benzo alprazolam xerostomie'],['bromazepam','Bromazépam','Lexomil','benzo xerostomie'],['lorazepam','Lorazépam','Témesta','benzo xerostomie'],
      ['oxazepam','Oxazépam','Séresta','benzo xerostomie'],['diazepam','Diazépam','Valium','benzo xerostomie'],['prazepam','Prazépam','Lysanxia','benzo xerostomie'],
      ['zolpidem','Zolpidem','Stilnox','benzo hypnotique'],['zopiclone','Zopiclone','Imovane','benzo hypnotique']])]}),
    o('antiepi','Antiépileptiques','Dépakine, Tégrétol, Keppra, Lamictal…',{tags:'antiepi', mots:'epilepsie', sous:[MOLECULES('m_ae',[
      ['valproate','Valproate','Dépakine','antiepi valproate'],['carbamazepine','Carbamazépine','Tégrétol','antiepi inducteur carbamazepine'],['oxcarbazepine','Oxcarbazépine','Trileptal','antiepi'],
      ['phenytoine','Phénytoïne','Di-Hydan','antiepi inducteur phenytoine hyperplasie'],['phenobarbital','Phénobarbital','Gardénal','antiepi inducteur'],['lamotrigine','Lamotrigine','Lamictal','antiepi'],
      ['levetiracetam','Lévétiracétam','Keppra','antiepi'],['topiramate','Topiramate','Epitomax','antiepi'],['lacosamide','Lacosamide','Vimpat','antiepi'],['clonazepam','Clonazépam','Rivotril','benzo antiepi'],
      ['pregabaline','Prégabaline','Lyrica','xerostomie'],['gabapentine','Gabapentine','Neurontin','']])]}),
    o('parkinson_t','Antiparkinsoniens','Modopar, Sinemet, Azilect…',{tags:'parkinson', mots:'parkinson', sous:[MOLECULES('m_pk',[
      ['levodopa','Lévodopa','Modopar, Sinemet, Stalevo','parkinson'],['pramipexole','Pramipexole','Sifrol','parkinson'],['ropinirole','Ropinirole','Requip','parkinson'],
      ['rasagiline','Rasagiline','Azilect · IMAO-B','imao_b'],['selegiline','Sélégiline','Deprenyl · IMAO-B','imao_b'],['safinamide','Safinamide','Xadago · IMAO-B','imao_b'],['bromocriptine','Bromocriptine','Parlodel','ergot_dopa']])]}),
    o('migraine','Antimigraineux','Triptans, dihydroergotamine',{sous:[MOLECULES('m_mig',[['triptan','Triptan','Sumatriptan, zolmitriptan…',''],['dhe','Dihydroergotamine','dérivé de l’ergot','ergot']])]}),
    o('opioides','Antalgiques opioïdes au long cours','Tramadol, codéine, morphine, oxycodone…',{tags:'morphinique', mots:'morphinique', sous:[MOLECULES('m_op',[
      ['tramadol','Tramadol','Topalgic, Ixprim','morphinique'],['codeine','Codéine','Dafalgan codéiné, Codoliprane','morphinique'],['morphine','Morphine','Skenan, Actiskenan','morphinique xerostomie'],
      ['oxycodone','Oxycodone','Oxycontin, Oxynorm','morphinique oxycodone xerostomie'],['fentanyl','Fentanyl','Durogesic, Abstral','morphinique fentanyl']])]}),
    o('substitution','Traitement de substitution aux opiacés','Méthadone, Subutex',{tags:'substitution', mots:'tso', sous:[MOLECULES('m_tso',[
      ['methadone','Méthadone','','morphinique qt substitution'],['buprenorphine','Buprénorphine','Subutex, Orobupré, Suboxone','morph_aa substitution']])]}),
    o('sevrage','Aide au sevrage alcoolique','Espéral, Aotal, Baclocur…',{tags:'alcool', mots:'alcool', sous:[MOLECULES('m_sev',[
      ['disulfirame','Disulfirame','Espéral','disulfirame alcool'],['acamprosate','Acamprosate','Aotal','alcool'],['naltrexone','Naltrexone','Revia','alcool'],['baclofene','Baclofène','Baclocur, Liorésal','alcool']])]}),
  ]},
  {groupe:'Digestif et urologie', items:[
    o('estomac','Médicaments de l’estomac','IPP, pansements gastriques, Motilium',{mots:'ipp reflux', sous:[MOLECULES('m_gi',[
      ['omeprazole','Oméprazole','Mopral','ipp'],['esomeprazole','Ésoméprazole','Inexium','ipp'],['pantoprazole','Pantoprazole','Inipomp, Eupantol','ipp'],['lansoprazole','Lansoprazole','Lanzor, Ogast','ipp'],
      ['rabeprazole','Rabéprazole','Pariet','ipp'],['antiacide','Pansement gastrique ou antiacide','Gaviscon, Maalox, Smecta','antiacide'],['domperidone','Dompéridone','Motilium','domperidone qt']])]}),
    o('uro','Prostate, vessie, érection','Tamsulosine, Xatral, Vesicare, Cialis…',{sous:[MOLECULES('m_uro',[
      ['tamsulosine','Tamsulosine','Omix, Josir','alphab'],['alfuzosine','Alfuzosine','Xatral','alphab'],['silodosine','Silodosine','Silodyx, Urorec','alphab'],
      ['finasteride','Finastéride ou dutastéride','Chibro-Proscar, Avodart',''],['oxybutynine','Oxybutynine','Ditropan','xerostomie'],['solifenacine','Solifénacine','Vesicare','xerostomie'],
      ['sildenafil','Sildénafil','Viagra, Revatio','pde5'],['tadalafil','Tadalafil','Cialis, Adcirca','pde5']])]}),
  ]},
  {groupe:'Infections', items:[
    o('arv','Antirétroviraux (VIH)','Biktarvy, Genvoya, Triumeq, Norvir…',{tags:'arv', mots:'vih', sous:[MOLECULES('m_arv',[
      ['ritonavir','Ritonavir ou cobicistat (booster)','Norvir, Kaletra, Genvoya, Symtuza','arv ritonavir'],['darunavir','Darunavir','Prezista','arv'],['bictegravir','Bictégravir','Biktarvy','arv'],
      ['dolutegravir','Dolutégravir','Tivicay, Triumeq, Dovato','arv'],['tenofovir','Ténofovir','Viread, Truvada','arv tenofovir'],['prep','Prophylaxie pré-exposition (PrEP)','Truvada','tenofovir']])]}),
    o('antituberc','Antituberculeux','Rifampicine, isoniazide…',{mots:'tuberculose', sous:[MOLECULES('m_tb',[
      ['rifampicine','Rifampicine','Rifadine, Rifinah','inducteur rifampicine'],['isoniazide','Isoniazide','Rimifon',''],['ethambutol','Éthambutol ou pyrazinamide','','']])]}),
  ]},
  {groupe:'Cancer : chimiothérapie, radiothérapie, hormonothérapie', items:[
    o('chimio_t','Chimiothérapie','',{tags:'chimio', mots:'cancer', sous:[
      {k:'p_chimio', titre:'Situation', type:'un', requis:true, options:[
        o('aplasiante','En cours, aplasiante','Baisse attendue des globules blancs',{eq:'chimio'}),
        o('non_aplasiante','En cours, non aplasiante','',{eq:'chimio_na'}),
        o('nsp','En cours, ne sait pas si elle est aplasiante','',{eq:'chimio_nsp'}),
        o('terminee','Terminée','',{eq:'chimio_finie'})]},
      MOLECULES('m_chimio',[
        ['platine','Sels de platine','Cisplatine, carboplatine, oxaliplatine',''],
        ['taxane','Taxanes','Paclitaxel, docétaxel',''],
        ['anthracycline','Anthracyclines','Doxorubicine, épirubicine',''],
        ['fluoropyr','Fluoropyrimidines','5-FU, capécitabine (Xeloda)','fluoropyr'],
        ['alkylant','Alkylants','Cyclophosphamide, ifosfamide, melphalan',''],
        ['busulfan','Busulfan','Myleran, Busilvex','busulfan'],
        ['mtx_fort','Méthotrexate à forte dose','','mtx'],
        ['gemcitabine','Gemcitabine ou pémétrexed','',''],
        ['vinca','Vinca-alcaloïdes','Vincristine, vinorelbine',''],
        ['topo','Étoposide ou irinotécan','','']], 'Familles et molécules (facultatif)')]}),
    o('radiotherapie','Radiothérapie','',{mots:'rayons irradiation cancer', sous:[
      {k:'p_radio', titre:'Zone et dose', type:'un', requis:true, options:[
        o('cf40','Tête et cou, 40 Gy ou plus sur les mâchoires','',{eq:'radio40'}),
        o('cf_moins40','Tête et cou, moins de 40 Gy','',{eq:'radio_moins40'}),
        o('cf_nsp','Tête et cou, dose inconnue','Considérée ≥ 40 Gy par prudence',{eq:'radio40 radio_nsp'}),
        o('autre','Autre zone','Sein, prostate, thorax…',{eq:'radio_autre'})]},
      {k:'p_radio_q', titre:'Quand ? (facultatif)', type:'un', options:[o('en_cours','En cours'), o('terminee','Terminée')]},
    ]}),
    o('hormono','Hormonothérapie','Cancer du sein ou de la prostate',{tags:'hormono_k', mots:'cancer', sous:[MOLECULES('m_horm',[
      ['tamoxifene','Tamoxifène','Nolvadex · sein','tamoxifene'],
      ['letrozole','Létrozole','Femara · anti-aromatase','hormono_k'],
      ['anastrozole','Anastrozole','Arimidex · anti-aromatase','hormono_k'],
      ['exemestane','Exémestane','Aromasine · anti-aromatase','hormono_k'],
      ['fulvestrant','Fulvestrant','Faslodex · sein','hormono_k'],
      ['lhrh','Agoniste ou antagoniste de la LH-RH','Décapeptyl, Eligard, Zoladex, Firmagon','hormono_k'],
      ['antiandrogene','Anti-androgène','Casodex, Xtandi, Erleada, Zytiga · prostate','hormono_k']], 'Molécules (facultatif)')]}),
    o('antiangio','Anti-angiogéniques','Avastin, Sutent, Nexavar, Votrient…',{tags:'antiangio', mots:'cancer', sous:[MOLECULES('m_angio',[
      ['bevacizumab','Bévacizumab','Avastin et biosimilaires','antiangio'],['sunitinib','Sunitinib','Sutent','antiangio'],['sorafenib','Sorafénib','Nexavar','antiangio'],['pazopanib','Pazopanib','Votrient','antiangio'],
      ['axitinib','Axitinib','Inlyta','antiangio'],['cabozantinib','Cabozantinib','Cabometyx','antiangio'],['lenvatinib','Lenvatinib','Lenvima','antiangio'],['regorafenib','Régorafénib','Stivarga','antiangio'],
      ['aflibercept','Aflibercept','Zaltrap','antiangio'],['ramucirumab','Ramucirumab','Cyramza','antiangio']])]}),
    o('ciblee','Autres thérapies ciblées et immunothérapie','Keytruda, Opdivo, Herceptin, Glivec…',{mots:'cancer', sous:[MOLECULES('m_cib',[
      ['immuno','Immunothérapie (anti-PD-1, anti-PD-L1)','Keytruda, Opdivo, Tecentriq',''],['her2','Anti-HER2','Herceptin, Perjeta, Enhertu',''],
      ['itk','Inhibiteurs de tyrosine kinase','Imatinib (Glivec), osimertinib (Tagrisso)…',''],['mtor','Inhibiteurs de mTOR','Évérolimus (Afinitor)','is_cyp chimio'],
      ['cdk','Inhibiteurs de CDK4/6','Ibrance, Kisqali, Verzenios','']], 'Molécules (facultatif)')]}),
  ]},
  {groupe:'Autres', items:[
    o('phyto','Phytothérapie','Millepertuis…',{sous:[MOLECULES('m_phyto',[['millepertuis','Millepertuis','','millepertuis inducteur']])]}),
    o('aucun','Aucun traitement en cours',''),
  ]},
];
R.ANTITHROMBO = ['antiplaq','aap','aap2','avk','aod','heparine'];
R.RISQUE_HEMO = [
  {v:'faible', t:'Risque hémorragique faible', d:'Avulsions sur un secteur, dents de sagesse, implant(s) sur un secteur, biopsie, kyste < 4 cm'},
  {v:'eleve', t:'Risque hémorragique élevé', d:'Avulsions de toute une arcade, implants sur plusieurs secteurs, greffe osseuse avec prélèvement, sinus lift, greffe gingivale palatine, kyste > 4 cm'},
];
R.BLOC_RISQUE = {k:'risque_hemo', titre:'Risque hémorragique de l’acte', type:'un', requis:true, grand:true, options:R.RISQUE_HEMO};

/* Toutes les options d'une question, à plat */
const plat = liste => liste.flatMap(g=>g.items||[g]);
R.option = (liste, v) => plat(liste).find(x=>x.v===v);

/* Lecture des réponses : codes du moteur (F), étiquettes d'interaction (tags : tag -> noms)
   et classes cochées sans molécule précisée (hypo). */
R.deriver = function(rep){
  const F = new Set(), tags = new Map(), hypo = [];
  const ajTags = (str, nom) => String(str||'').split(/\s+/).filter(Boolean).forEach(t=>{ if(!tags.has(t)) tags.set(t, new Set()); tags.get(t).add(nom); });
  const ajCodes = str => String(str||'').split(/\s+/).filter(Boolean).forEach(c=>F.add(c));
  const lire = (liste, choisis) => (choisis||[]).forEach(v=>{
    F.add(v);
    const it = R.option(liste, v); if(!it) return;
    ajCodes(it.eq);
    let molBloc = null, molChoisie = false;
    (it.sous||[]).forEach(b=>{
      const r = rep[b.k], vals = Array.isArray(r) ? r : (r ? [r] : []);
      if(b.mol) molBloc = b;
      vals.forEach(x=>{ const so = b.options.find(y=>y.v===x); if(!so) return; F.add(b.k+'.'+x); ajCodes(so.eq); if(b.mol){ molChoisie = true; ajTags(so.tags, so.t); } });
    });
    if(!molChoisie) ajTags(it.tags, it.t);
    if(molBloc && !molChoisie) hypo.push({classe:it.t, mols:molBloc.options});
  });
  lire(R.ATCD, rep.atcd); lire(R.TTT, rep.ttt);
  // Antiplaquettaires : la bithérapie l'emporte (deux molécules cochées ou Duoplavin)
  const mAap = rep.m_aap || [];
  if((rep.ttt||[]).includes('antiplaq') && (mAap.length>=2 || mAap.includes('duoplavin'))) F.add('aap2');
  if((rep.ttt||[]).includes('antiplaq') && !F.has('aap2')) F.add('aap');
  if(F.has('aap2')) F.delete('aap');
  return {F, tags, hypo};
};
/* Précisions obligatoires non remplies pour une question */
R.manquants = function(rep, id){
  const liste = id==='atcd' ? R.ATCD : R.TTT;
  const out = [];
  (rep[id]||[]).forEach(v=>{ const it = R.option(liste, v); (it?.sous||[]).forEach(b=>{ const r=rep[b.k]; if(b.requis && !(Array.isArray(r)?r.length:r)) out.push(b.k); }); });
  return out;
};
/* Médicaments reconnus par le scanner -> réponses de Prescri'Dent */
R.depuisScanner = function(meds){
  const N0 = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim();
  const res = {ttt:[], sous:{}, atcd:[]};
  const coche = (cl, k, v) => { if(!res.ttt.includes(cl)) res.ttt.push(cl); if(k){ res.sous[k] = res.sous[k]||[]; if(v && !res.sous[k].includes(v)) res.sous[k].push(v); } };
  const reglerUn = (k, v) => { res.sous[k] = v; };
  const PAR_TAG = [['aod','aod'],['avk','avk'],['heparine','heparine'],['aap','antiplaq'],['insuline','insuline'],['antidiab','antidiab'],['iec','iec'],['ara2','ara2'],['diuretique','diuretique'],
    ['betabloquant','betabloquant'],['ica','ica'],['antiarythmique','antiarythmique'],['angor','antiangor'],['statine','hypolip'],['cortico_os','cortico_c'],['cortico_inh','cortico_inh'],['respi','respi'],
    ['isrs','antidep'],['irsna','antidep'],['tricyclique','antidep'],['antiepi','antiepi'],['benzo','benzo'],['antiangio','antiangio'],['arv','arv'],['ipp','estomac'],['antiacide','estomac'],['alphab','uro'],
    ['pde5','uro'],['ains','ains_c'],['substitution','substitution'],['morphinique','opioides'],['mtx','mtx'],['immunosup','immunosup'],['lithium','thymo'],['bp_os','bisphos'],['hormono_k','hormono'],
    ['tamoxifene','hormono'],['fluoropyr','chimio_t'],['parkinson','parkinson_t'],['imao_b','parkinson_t'],['alcool','sevrage']];
  for(const m of meds){
    const d = N0(m.dci), tg = m.tags || new Set();
    if(tg.has('antirejet') && !res.atcd.includes('greffe')) res.atcd.push('greffe');
    if(d==='everolimus' && /cancer/i.test(m.classe||'')){ coche('ciblee','m_cib','mtor'); continue; }
    if(tg.has('aspirine_forte')){ coche('ains_c','m_ains','aspirine_forte'); continue; }
    if(/zoledronate .*zometa|zometa/.test(N0(m.dci+' '+m.classe)) || tg.has('bp_malin')){ coche('bisphos','m_bp', /pamidron/.test(d)?'pamidronate':/clodron/.test(d)?'clodronate':'zoledronate'); reglerUn('p_bp','malin'); continue; }
    if(tg.has('denosumab_malin')){ coche('denosumab_c'); reglerUn('p_deno','malin'); continue; }
    if(tg.has('denosumab_os')){ coche('denosumab_c'); continue; }
    if(tg.has('insuline')){ coche('insuline'); continue; }
    let trouve = null;
    for(const it of plat(R.TTT)) for(const b of (it.sous||[])) if(b.mol) for(const so of b.options){ if(!trouve && N0(so.t)===d) trouve = [it.v, b.k, so.v]; }
    const prem = w => String(w).split(/[ +]/)[0];
    if(!trouve) for(const it of plat(R.TTT)) for(const b of (it.sous||[])) if(b.mol) for(const so of b.options){ if(!trouve && prem(N0(so.t))===prem(d) && prem(d).length>=5) trouve = [it.v, b.k, so.v]; }
    if(!trouve){ const t = PAR_TAG.find(([g])=>tg.has(g)); if(t) trouve=[t[1]]; }
    if(trouve) coche(...trouve);
  }
  if(res.ttt.includes('antiplaq')){ const n=(res.sous.m_aap||[]); res.sous.p_aap = (n.length>=2 || n.includes('duoplavin')) ? 'bi' : 'mono'; }
  return res;
};

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
  const D = R.deriver(rep), at = D.F, tt = D.F, al = new Set(rep.allergies||[]), ext = new Set(rep.extension||[]);
  const ria = R.RIA.some(x=>at.has(x)), hron = R.HRON.some(x=>at.has(x)), eiHaut = at.has('ei_haut');
  const malin = at.has('malin') || at.has('bp_malin') || at.has('antiangio') || at.has('deno_malin'), radio = at.has('radio40');
  const enceinte = p==='enceinte', terme6 = enceinte && rep.terme==='apres';
  const K = enfant && kg>0, moins6 = enfant && (!(age>=0) || age<6);
  const sousAOD = tt.has('aod'), qt = at.has('qt') || D.tags.has('qt');
  const O = {gestes:[], pourquoi:[], alertes:[], lignes:[], hospit:false, atb:false, prophy:false};
  const src = s => s ? ` <span class="src">${s}</span>` : '';
  const why = (t,s) => O.pourquoi.push(t+src(s));
  const alerte = (n,t,d,s) => O.alertes.push({n,t,d:d+src(s)});
  const ligne = (id,cat,med,pos,qsp) => O.lignes.push({id,cat,med,pos,qsp});
  const buv = moins6 ? ' (forme buvable)' : '';
  const kgManquant = '(dose au poids : renseigner le poids)';

  /* ---- Interactions avec le traitement du patient [thésaurus ANSM, table de medicaments.js] ----
     Une classe cochée sans molécule donne des interactions « hypothétiques » : elles ne changent pas
     le choix des molécules, mais demandent de préciser. */
  const IX = (typeof window!=='undefined' && window.MEDS && window.MEDS.INTERACTIONS) || [];
  const RANG = {CI:4, ASDEC:3, PE:2, APEC:1};
  const memo = {};
  function inter(id){
    if(memo[id]) return memo[id];
    const out = [];
    for(const [dents, tg, niv, txt, src] of IX){
      if(!dents.split(' ').includes(id)) continue;
      const T = tg.split(' '), noms = new Set(), vus = [];
      T.forEach(t=>{ if(D.tags.has(t)){ vus.push(t); D.tags.get(t).forEach(n=>noms.add(n)); } });
      if(noms.size) out.push({niv, txt, src, tags:vus, meds:[...noms]});
      else D.hypo.forEach(h=>{ const ms = h.mols.filter(mo=>String(mo.tags).split(' ').some(t=>T.includes(t))); if(ms.length) out.push({niv, txt, src, tags:[], meds:ms.map(x=>x.t), hypo:h.classe}); });
    }
    return memo[id] = out;
  }
  const niv = id => Math.max(0, ...inter(id).filter(x=>!x.hypo).map(x=>RANG[x.niv]));
  const raisons = id => inter(id).filter(x=>!x.hypo && RANG[x.niv]>=3).map(x=>x.txt).join(' ');
  const TH = 'Thésaurus ANSM';

  /* ---- Alternatives aux pénicillines, par ordre de préférence HAS ---- */
  const macroOK = !al.has('macrolides') && !qt && niv('azi')<3;
  const clariOK = !al.has('macrolides') && !qt && !sousAOD && niv('clari')<3;
  const pristOK = !al.has('pristina') && !moins6 && niv('prist')<3;
  const metroNon = al.has('metro') || niv('metro')>=3;
  const noteMetro = () => { if(!al.has('metro') && niv('metro')>=3) alerte('moy','Métronidazole écarté', raisons('metro'), TH); };
  function noteAlternative(){
    if(al.has('macrolides')) alerte('moy','Macrolides écartés','Allergie aux macrolides.','');
    else if(qt) alerte('moy','Macrolides écartés','QT long ou médicament qui allonge le QT : azithromycine et clarithromycine à éviter.','HAS 2024');
    else {
      if(sousAOD) alerte('moy','Clarithromycine écartée','À éviter chez un patient sous AOD : azithromycine proposée.','SFCO 2015');
      else if(niv('clari')>=3) alerte('moy','Clarithromycine écartée', raisons('clari'), TH);
      if(niv('azi')>=3) alerte('moy','Azithromycine écartée', raisons('azi'), TH);
    }
    if(!al.has('pristina') && !moins6 && niv('prist')>=3) alerte('moy','Pristinamycine écartée', raisons('prist'), TH);
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
      if(!metroNon) { metroLigne(); why(raison+' Métronidazole en 1re intention, 3 jours.','HAS 2026'); }
      else if(!peni) { ligne('abc','Antibiotique','Amoxicilline'+buv, amoxPos, qsp3); why(raison+(al.has('metro')?' Allergie au métronidazole':' Métronidazole écarté (interaction)')+' : amoxicilline en alternative, 3 jours.','HAS 2026'); noteMetro(); }
      else alerte('forte','Allergies multiples','Avis spécialisé.','');
    } else if(!peni){
      ligne('abc','Antibiotique','Amoxicilline'+buv, amoxPos, qsp3);
      why(raison+' Amoxicilline en 1re intention, 3 jours.','HAS 2026');
    } else if(type==='peri' && !metroNon){
      metroLigne();
      why(raison+' Allergie aux pénicillines : métronidazole en alternative, 3 jours.','HAS 2026');
    } else {
      if(clariOK) ligne('abc','Antibiotique','Clarithromycine (hors AMM)'+buv, K?`${g(parPrise(kg,15,1000,2))} 2 fois par jour (15 mg/kg/j, max 1 g/j)`:(enfant?kgManquant:'500 mg 2 fois par jour'), qsp3);
      else if(macroOK) ligne('abc','Antibiotique','Azithromycine'+buv, K?`${g(dose(kg,20,500))} 1 fois par jour (20 mg/kg/j, max 500 mg/j)`:(enfant?kgManquant:'500 mg 1 fois par jour'),'3 jours');
      else if(pristOK) ligne('abc','Antibiotique','Pristinamycine (hors AMM)', K?`${g(parPrise(kg,50,2000,3))} 3 fois par jour (50 mg/kg/j, max 2 g/j)`:(enfant?kgManquant:'1 g 2 fois par jour'), qsp3);
      else alerte('forte','Aucune alternative orale','Avis spécialisé.','');
      noteAlternative(); if(type==='peri') noteMetro();
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
      if(!al.has('peni') && !metroNon) ligne('abc','Antibiotique','Amoxicilline + métronidazole','500 mg + 500 mg, 3 fois par jour','3 jours');
      else if(!metroNon) ligne('abc','Antibiotique','Métronidazole','500 mg 3 fois par jour','3 jours');
      else if(macroOK) ligne('abc','Antibiotique','Azithromycine','500 mg 1 fois par jour','3 jours');
      if(!metroNon) alerte('moy','Métronidazole et alcool','Effet antabuse : pas d’alcool pendant le traitement.','RCP'); else noteMetro();
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
      if(tt.has('avk') || tt.has('sulfamide') || niv('micon')>=3){
        alerte('forte','Miconazole contre-indiqué', (tt.has('avk')||tt.has('sulfamide')) ? 'Contre-indiqué avec les antivitamines K (hémorragies graves) et les sulfamides hypoglycémiants, y compris en gel buccal.' : raisons('micon')+' Y compris en gel buccal.','RCP');
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
  if(['hemophilie','willebrand','deficit_facteur','thrombopenie'].some(x=>at.has(x))) ainsNon.push('trouble de l’hémostase (effet antiplaquettaire des AINS)');
  if(at.has('ulcere')) ainsNon.push('ulcère ou hémorragie digestive');
  if(at.has('ir_severe') || at.has('ir_moderee')) ainsNon.push('insuffisance rénale');
  if(at.has('ih_severe')) ainsNon.push('insuffisance hépatique sévère');
  if(at.has('insuf_card')) ainsNon.push('insuffisance cardiaque');
  if(tt.has('mtx')) ainsNon.push('méthotrexate (interaction)');
  if(at.has('asthme_ains')) ainsNon.push('asthme déclenché par l’aspirine ou les AINS');
  if(at.has('p_bari.bypass')) ainsNon.push('bypass gastrique (risque d’ulcère anastomotique)');
  inter('ibu').filter(x=>!x.hypo && RANG[x.niv]>=3 && !x.tags.some(t=>['anticoag','heparine','aap','mtx'].includes(t)))
    .forEach(x=>{ const r=x.txt.split(' :')[0].toLowerCase()+' (interaction)'; if(!ainsNon.includes(r)) ainsNon.push(r); });
  const ainsPrudence = [];
  if(at.has('mici')) ainsPrudence.push('MICI : risque de poussée');
  if(at.has('p_bari.sleeve')) ainsPrudence.push('sleeve gastrectomie : risque d’ulcère');
  inter('ibu').filter(x=>!x.hypo && x.niv==='PE').forEach(x=>ainsPrudence.push(x.txt.replace(/\.$/,'')));
  const ainsUtile = !actCI && ['pulpite','abces','abces_paro','alveolite_seche','alveolite_suppuree','pericoronarite','avulsion','avulsion_incluse','autotransplantation','chir_preortho','chir_preprothetique','implant','greffe_osseuse','chir_paro','chir_periapicale','chir_periimplantaire','trauma_luxation','trauma_expulsion','endo','endo_vitale','herpes_primo','biopsie_os'].includes(m);
  if(ainsUtile){
    if(!ainsNon.length){
      ligne('ibu','Anti-inflammatoire','Ibuprofène', enfant ? (kg?`${arr(kg*10)} mg 3 fois par jour au cours des repas (10 mg/kg, max 30 mg/kg/j, dès 3 mois)`:'10 mg/kg 3 fois par jour (renseigner le poids)') : '400 mg 3 fois par jour au cours des repas (max 1 200 mg/j)','3 jours');
      const li = O.lignes[O.lignes.length-1];
      // proposé mais pas coché d'office : avulsion simple, ou terrain qui demande de la prudence
      if(ainsPrudence.length){ li.decoche = true; alerte('moy','Ibuprofène proposé, non coché', ainsPrudence.join(' ; ')+'. À cocher seulement si le bénéfice l’emporte.', 'RCP ; '+TH); }
      else if(m==='avulsion') li.decoche = true;
    } else alerte('info','Ibuprofène écarté', ainsNon.join(' ; ')+'.', enceinte?'ANSM':'RCP');
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
  if(['bp_benin','denosumab_ancien','radio_moins40','remission','prothese_art','diabete_eq','p_vih.ok','p_asplenie.ancien','cortico_faible'].some(x=>at.has(x)) && !ria && !hron) alerte('info','Assimilé à la population générale','Cet antécédent ne modifie pas l’indication d’antibiotique selon la HAS.','HAS 2026');
  if(at.has('ir_severe') || at.has('ir_moderee')) alerte('moy','Insuffisance rénale','Antibioprophylaxie en prise unique : pas d’adaptation. Antibiothérapie prolongée ou curative : adapter au DFG. AINS à éviter.','HAS 2026');
  if(at.has('ih') || at.has('ih_severe')) alerte('moy','Insuffisance hépatique ou alcoolisme','Paracétamol : 2 g par jour au maximum, 8 h entre les prises.','RCP');
  if(qt && !al.has('peni')) alerte('info','QT long','Si une alternative à l’amoxicilline était nécessaire : éviter azithromycine et clarithromycine.','HAS 2024');
  if(at.has('asthme') && !al.has('ains')) alerte('info','Asthme','AINS contre-indiqués si l’asthme est déclenché par l’aspirine ou les AINS : vérifier à l’interrogatoire.','RCP');
  if(al.has('latex')) alerte('moy','Allergie au latex','Gants et matériel sans latex, de préférence en début de vacation.','');
  if(al.has('al')) alerte('forte','Allergie aux anesthésiques locaux','Vraie allergie rare : bilan allergologique avant les soins pour identifier une molécule utilisable.','');
  if(al.has('iode')) alerte('info','Allergie à la povidone iodée','Antisepsie à la chlorhexidine.','');
  if(al.has('peni') && al.has('cephalo')) alerte('info','Allergie aux bêta-lactamines','Céphalosporines également écartées.','');

  /* ---- 4 bis. Troubles de l'hémostase et précautions d'anesthésie ---- */
  const chirH = !!M.chir;
  const mhc = ['hemophilie','willebrand','deficit_facteur'].filter(x=>at.has(x));
  if(mhc.length){
    if(chirH) alerte('forte','Maladie hémorragique constitutionnelle','Geste à organiser avec le centre qui suit le patient (centre de traitement de l’hémophilie ou centre de ressources et de compétence des maladies hémorragiques constitutionnelles) : il décide du traitement préventif (facteur de substitution, desmopressine) et du lieu de prise en charge, souvent hospitalier. Avulsions multiples en plusieurs séances, par hémi-arcade ; geste le moins délabrant possible, lambeaux muco-périostés, hémostase locale soigneuse. Anesthésie locale avec vasoconstricteur à privilégier. Pas d’aspirine ni d’AINS.','Med Buccale Chir Buccale 2005 ; PNDS Willebrand HAS 2021');
    else alerte('moy','Maladie hémorragique constitutionnelle','Soins non chirurgicaux possibles ; anesthésie locale avec vasoconstricteur à privilégier. Avant tout geste sanglant, contacter le centre qui suit le patient. Pas d’aspirine ni d’AINS.','Med Buccale Chir Buccale 2005 ; PNDS Willebrand HAS 2021');
  }
  if(at.has('thrombopenie')) alerte(chirH?'forte':'moy','Thrombopénie ou thrombopathie', (chirH?'Demander une numération plaquettaire récente et l’avis de l’hématologue. Seuil habituellement retenu pour un geste invasif : au moins 50 G/L ; en dessous, à organiser avec l’hématologue. ':'')+'Hémostase locale systématique. Pas d’aspirine ni d’AINS.','Littérature (World Workshop on Oral Medicine 2019)');
  if(at.has('hta')) alerte('moy', rep.eq_hta==='nsp'?'Hypertension : équilibre inconnu':'Hypertension non équilibrée','Prendre la tension avant le soin : à 180/110 mmHg ou plus, reporter les soins non urgents. Adrénaline avec précaution : doses minimales, injection lente après aspiration.','RCP articaïne adrénalinée');
  if(at.has('coronarien')) alerte('moy','Insuffisance coronarienne','Adrénaline avec précaution : doses minimales, injection lente après aspiration. Séances courtes, trinitrine du patient à portée de main.','RCP articaïne adrénalinée');
  if(at.has('rythme')) alerte('moy','Trouble du rythme ou de la conduction','Adrénaline avec précaution. Trouble de la conduction auriculo-ventriculaire sévère non appareillé : articaïne contre-indiquée.','RCP articaïne adrénalinée');
  if(at.has('porphyrie')) alerte('forte','Porphyrie aiguë intermittente','Articaïne contre-indiquée : vérifier le RCP de l’anesthésique utilisé.','RCP articaïne adrénalinée');
  if(at.has('epilepsie')){
    const ne = at.has('epi_ne');
    alerte(ne?'forte':'moy', ne ? (rep.eq_epi==='nsp'?'Épilepsie : équilibre inconnu':'Épilepsie non équilibrée') : 'Épilepsie', (ne?'Reporter les soins non urgents si les crises ne sont pas contrôlées. ':'')+'Épilepsie non contrôlée par un traitement : articaïne et tramadol contre-indiqués. Néfopam contre-indiqué (antécédent de convulsions).','RCP');
  }
  if(at.has('glaucome') || at.has('prostate')) alerte('info', at.has('glaucome')?'Glaucome à angle fermé':'Troubles urétro-prostatiques','Néfopam contre-indiqué (effets atropiniques).','RCP');

  /* ---- 4 ter. Autres antécédents, chirurgies et traitements ---- */
  const noms = t => [...(D.tags.get(t)||[])].join(', ');
  const auto = ['mici','pr','spa','lupus','sjogren','sclerodermie','psoriasis','behcet','vascularite','sep','bulleuse'];
  const T2 = [
    ['cong_nsp','moy','Cardiopathie congénitale : type à préciser','Demander au cardiologue si elle relève du haut risque d’endocardite (cyanogène, réparée avec du matériel depuis moins de 6 mois, shunt ou fuite résiduels) avant tout acte invasif.','HAS 2024'],
    ['pacemaker','info','Stimulateur ou défibrillateur','Éviter le bistouri électrique monopolaire.',''],
    ['hta_eq','info','Hypertension équilibrée','Prendre la tension en début de séance. Adrénaline utilisable, injection lente après aspiration.',''],
    ['p_coro.stent_recent','forte','Stent coronaire de moins de 12 mois','Bithérapie antiplaquettaire probable : ne jamais l’interrompre sans l’avis du cardiologue (risque de thrombose de stent). Soins non urgents à discuter avec lui. Le stent ne crée pas de risque d’endocardite : pas d’antibioprophylaxie pour cette raison.','SFCO 2015 ; HAS 2024'],
    ['p_coro.stent_ancien','info','Stent coronaire','Il ne crée pas de risque d’endocardite : pas d’antibioprophylaxie pour cette raison. Ne pas arrêter l’antiplaquettaire.','HAS 2024 ; SFCO 2015'],
    ['p_coro.pontage','info','Pontage coronarien','Il ne crée pas de risque d’endocardite : pas d’antibioprophylaxie pour cette raison.','HAS 2024'],
    ['p_coro.idm_recent','forte','Infarctus récent ou angor instable','Reporter les soins non urgents. En urgence : geste minimal, après avis du cardiologue, idéalement en milieu hospitalier. Trinitrine à portée de main.',''],
    [()=>at.has('p_art.prothese_vasc')||at.has('p_art.endoprothese'),'info','Prothèse ou pontage vasculaire','Ne fait pas partie des situations à risque d’endocardite : pas d’antibioprophylaxie pour cette raison.','HAS 2024'],
    ['thrombose','info','Phlébite ou embolie pulmonaire','Souvent sous anticoagulant : à cocher dans les traitements.',''],
    ['avc','info','AVC ou AIT','Souvent sous antiplaquettaire ou anticoagulant. Après un AVC récent, reporter les soins non urgents, en lien avec le neurologue.',''],
    ['diabete_nsp','moy','Diabète : équilibre inconnu','Demander une HbA1c de moins de 3 mois ou contacter le médecin traitant : 9 % ou plus = risque infectieux augmenté.','HAS 2026'],
    [()=>at.has('dt1')||D.tags.has('insuline')||D.tags.has('sulfamide')||D.tags.has('repaglinide'),'info','Risque d’hypoglycémie','Rendez-vous après un repas, sans sauter la prise alimentaire ; sucre à portée de main.',''],
    [()=>D.tags.has('gliflozine'),'info','Gliflozine ('+noms('gliflozine')+')','Risque d’acidocétose en cas de jeûne prolongé ou de chirurgie lourde : ne pas laisser le patient à jeun.','RCP'],
    ['hypothyro_ne','moy','Hypothyroïdie non équilibrée','Reporter les soins non urgents jusqu’à l’équilibre. Prudence avec les sédatifs et les opioïdes.',''],
    ['hyperthyro_ne','moy','Hyperthyroïdie non équilibrée','Reporter les soins non urgents. Adrénaline à éviter ou à doses minimales (troubles du rythme).',''],
    [()=>D.tags.has('antithyro'),'moy','Antithyroïdien de synthèse ('+noms('antithyro')+')','Fièvre, angine ou ulcérations buccales : NFS en urgence (agranulocytose).','RCP'],
    [()=>at.has('surrenal')||at.has('cortico')||D.tags.has('hydrocortisone'),'moy','Risque d’insuffisance surrénale aiguë','Insuffisance surrénalienne ou corticothérapie prolongée : un geste stressant ou chirurgical peut la déclencher. Adapter la dose de corticoïde avec le médecin (souvent augmentée le jour du geste). Séances courtes, le matin.',''],
    ['mici','info','MICI','Aphtes et lésions granulomateuses possibles (maladie de Crohn). AINS à éviter (risque de poussée).','RCP ibuprofène'],
    ['pr','info','Polyarthrite rhumatoïde','Atteinte possible de l’ATM et des mains : hygiène orale plus difficile, brosse électrique utile.',''],
    ['spa','info','Spondyloarthrite','Raideur cervicale : installation adaptée au fauteuil.',''],
    ['lupus','info','Lupus','Atteinte rénale, thrombopénie ou syndrome des antiphospholipides possibles : demander le dernier bilan.',''],
    ['sjogren','moy','Syndrome de Gougerot-Sjögren','Sécheresse buccale : risque carieux et candidosique élevé. Fluor, substituts salivaires, suivi rapproché.',''],
    ['sclerodermie','info','Sclérodermie','Ouverture buccale réduite : séances courtes, matériel adapté.',''],
    ['behcet','info','Maladie de Behçet','Aphtose buccale récidivante. Souvent sous colchicine : à préciser dans les traitements (interaction avec les macrolides).',''],
    ['bulleuse','info','Maladie bulleuse','Muqueuse fragile : gestes doux, éviter les frottements. Souvent sous corticoïdes.',''],
    ['lichen','info','Lichen plan buccal','Surveillance régulière : biopsie si une lésion change d’aspect.',''],
    ['celiaque','info','Maladie cœliaque','Défauts de l’émail et aphtes fréquents.',''],
    [()=>auto.some(x=>at.has(x)) && !['immunosup','cortico','cortico_faible','cortico_nsp'].some(x=>at.has(x)),'info','Maladie inflammatoire ou auto-immune','Le risque infectieux dépend du traitement : immunosuppresseur, biothérapie ou corticoïdes sont à cocher à la question des traitements.','HAS 2026'],
    ['anemie','info','Anémie','Glossite, perlèche, aphtes et retard de cicatrisation possibles. Anémie sévère : bilan avant une chirurgie.',''],
    ['vih_nsp','moy','VIH : CD4 inconnus','Demander le dernier bilan : moins de 200 CD4/mm³ = risque infectieux augmenté.','HAS 2026'],
    ['asplenie_nsp','moy','Asplénie : date inconnue','Moins de 5 ans = risque infectieux augmenté : le demander.','HAS 2026'],
    ['hepatite','info','Hépatite virale','Précautions standard. Si le foie est atteint : voir l’insuffisance hépatique (thrombopénie, troubles de la coagulation possibles).',''],
    ['p_tuberc.active','forte','Tuberculose active','Reporter les soins non urgents jusqu’à la fin de la contagiosité (avis du médecin). En urgence : masque FFP2, limiter les aérosols.',''],
    ['p_k_type.vads','moy','Cancer des voies aérodigestives supérieures','Rechercher une radiothérapie cervico-faciale et la dose reçue sur les mâchoires (question des traitements).','HAS 2026'],
    [()=>['p_k_type.myelome','p_k_type.sein','p_k_type.prostate'].some(x=>at.has(x)) && !['bisphos','denosumab_c'].some(x=>at.has(x)),'moy','Métastases osseuses fréquentes','Rechercher un bisphosphonate ou du dénosumab (risque d’ostéonécrose).','HAS 2026'],
    [()=>at.has('p_k_type.leucemie')||at.has('p_k_type.lymphome'),'moy','Hémopathie maligne','Demander une NFS récente (neutrophiles, plaquettes) : risque infectieux et hémorragique.',''],
    ['onm_atcd','forte','Antécédent d’ostéonécrose des mâchoires','Avis du service qui l’a prise en charge avant tout geste invasif.',''],
    ['dialyse','moy','Dialyse','Soins le lendemain d’une séance (héparine pendant la dialyse). Ne pas prendre la tension ni piquer sur le bras de la fistule.',''],
    ['rgo','info','Reflux gastro-œsophagien','Érosions dentaires possibles, surtout sur les faces palatines.',''],
    ['bpco','info','BPCO ou insuffisance respiratoire','Position semi-assise, séances courtes. Éviter les sédatifs (benzodiazépines) et les opioïdes.',''],
    ['saos','info','Apnée du sommeil','Éviter les sédatifs et les opioïdes.',''],
    ['parkinson','info','Maladie de Parkinson','Rendez-vous environ 1 h après la prise du traitement. Se relever lentement (hypotension orthostatique).',''],
    ['sep','info','Sclérose en plaques','Fatigue : séances courtes, plutôt le matin. Névralgie du trijumeau possible.',''],
    ['demence','info','Troubles cognitifs','Associer l’aidant au consentement et aux consignes ; consignes écrites ; hygiène orale à superviser.',''],
    ['p_psy.anxiete','info','Phobie des soins','Séances courtes, expliquer chaque étape ; sédation consciente (MEOPA) si besoin.',''],
    ['p_psy.tca','info','Trouble du comportement alimentaire','Érosions dentaires possibles (vomissements) : fluor, ne pas brosser juste après un vomissement.',''],
    ['p_psy.addiction','info','Addiction','Opioïdes (codéine, tramadol) à éviter : paracétamol et AINS en premier.',''],
    ['handicap','info','Handicap ou trouble du neurodéveloppement','Adapter la communication et la durée des séances. Trisomie 21 : rechercher une cardiopathie congénitale ; parodontite précoce fréquente.',''],
    [()=>(at.has('osteoporose')||at.has('paget')) && !['bisphos','denosumab_c','osteo_autre'].some(x=>at.has(x)),'info','Ostéoporose ou Paget','Le risque d’ostéonécrose dépend du traitement (bisphosphonate et sa durée, dénosumab et sa dernière injection) : coche-le dans les traitements.','HAS 2026'],
    ['tabac','info','Tabagisme','Risque accru d’alvéolite, de retard de cicatrisation et d’échec implantaire : conseiller l’arrêt, au moins autour du geste.',''],
    ['bp_nsp','moy','Bisphosphonate : indication ou durée inconnue','Considéré à haut risque d’ostéonécrose par prudence : demander l’indication et la durée cumulée.','HAS 2026'],
    ['deno_nsp','moy','Dénosumab : dernière injection inconnue','Considéré à haut risque d’ostéonécrose par prudence : demander la date de la dernière injection.','HAS 2026'],
    [()=>D.tags.has('romosozumab'),'moy','Romosozumab (Evenity)','Des ostéonécroses des mâchoires sont décrites : gestes les moins invasifs.','RCP Evenity'],
    ['radio_nsp','moy','Radiothérapie : dose inconnue','Considérée à 40 Gy ou plus par prudence : demander la dosimétrie au radiothérapeute.','HAS 2026'],
    ['radio_autre','info','Radiothérapie hors tête et cou','Pas de risque d’ostéoradionécrose des mâchoires.','HAS 2026'],
    ['p_radio_q.en_cours','forte','Radiothérapie en cours','Mucite, candidose et sécheresse fréquentes. Pas de geste invasif sans l’avis du radiothérapeute ; gouttières fluorées.',''],
    ['chimio_nsp','moy','Chimiothérapie : aplasiante ?','Demander à l’oncologue si elle est aplasiante et la date de la dernière NFS.','HAS 2026'],
    ['chimio_na','info','Chimiothérapie non aplasiante','Demander la date de la dernière NFS avant un geste invasif.',''],
    ['chimio_finie','info','Chimiothérapie terminée','Si l’arrêt est récent, vérifier la récupération sur une NFS.',''],
    [()=>(D.tags.has('hormono_k')||D.tags.has('tamoxifene')) && !['bisphos','denosumab_c'].some(x=>at.has(x)),'info','Hormonothérapie du cancer','Souvent associée à un bisphosphonate ou au dénosumab : le demander.',''],
    ['cortico_nsp','moy','Corticoïdes : dose inconnue','Demander la dose et la durée : 10 mg/j ou plus depuis plus de 2 semaines = risque infectieux augmenté.','HAS 2026'],
    [()=>D.tags.has('cortico_inh'),'info','Corticoïdes inhalés','Candidose buccale possible : rincer la bouche après chaque inhalation.',''],
    [()=>D.tags.has('respi'),'info','Traitement respiratoire','Ventoline du patient à portée de main pendant le soin.',''],
    [()=>D.tags.has('angor') && !at.has('coronarien'),'moy','Angor','Trinitrine du patient à portée de main. Adrénaline avec précaution : doses minimales, aspiration avant injection.','RCP articaïne adrénalinée'],
    [()=>D.tags.has('bb_ns'),'moy','Bêtabloquant non cardiosélectif ('+noms('bb_ns')+')','Avec l’adrénaline : poussée hypertensive et bradycardie possibles. Doses minimales, injection lente après aspiration.','RCP articaïne adrénalinée'],
    [()=>D.tags.has('valproate'),'moy','Valproate','Thrombopénie et troubles de l’hémostase possibles : plaquettes et bilan d’hémostase avant une chirurgie.','RCP Dépakine'],
    [()=>D.tags.has('hyperplasie'),'info','Accroissement gingival possible','Avec '+noms('hyperplasie')+' : contrôle de plaque strict, détartrages rapprochés.',''],
    [()=>D.tags.has('xerostomie'),'info','Sécheresse buccale probable','Avec '+noms('xerostomie')+' : risque carieux et candidosique accru. Fluor, hydratation, substituts salivaires.',''],
  ];
  T2.forEach(([c,n,t,d,s])=>{ if(typeof c==='function' ? c() : at.has(c)) alerte(n,t,d,s); });

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

  /* ---- 5 bis. Interactions de l'ordonnance avec son traitement [thésaurus ANSM] ---- */
  const NIVN = {CI:'forte', ASDEC:'forte', PE:'moy', APEC:'info'};
  const NIVT = {CI:'contre-indiqué', ASDEC:'déconseillé', PE:'précaution d’emploi', APEC:'à prendre en compte'};
  const idsLigne = l => { const s = new Set((typeof window!=='undefined' && window.MEDS) ? window.MEDS.idsDentaires(l.med, []) : []); if(l.id==='para') s.add('para'); if(l.id==='ibu') s.add('ibu'); return [...s]; };
  const vusTxt = new Set(), hypos = [];
  const court = med => med.replace(/\s*\(.*?\)/g,'').replace(/ \d.*$/,'');
  const traiter = (nom, ids) => {
    const L = ids.flatMap(id=>inter(id).filter(x=>!(x.tags.includes('avk') && id!=='para'))); // INR : déjà dans l'alerte AVK
    const reel = L.filter(x=>!x.hypo && !vusTxt.has(x.txt));
    reel.forEach(x=>vusTxt.add(x.txt));
    L.filter(x=>x.hypo && !vusTxt.has(x.hypo+x.txt)).forEach(x=>{ vusTxt.add(x.hypo+x.txt);
      const effet = x.txt.includes(' : ') ? x.txt.slice(x.txt.indexOf(' : ')+3) : x.txt;
      const qui = x.meds.length<=3 ? x.meds.join(' ou ').toLowerCase() : x.txt.split(' : ')[0].toLowerCase();
      hypos.push(`${x.hypo} : si ${qui}, ${effet.charAt(0).toLowerCase()+effet.slice(1).replace(/\.$/,'')} (${nom.toLowerCase()} : ${NIVT[x.niv]}).`); });
    if(!reel.length) return;
    const pire = reel.reduce((a,x)=>RANG[x.niv]>RANG[a]?x.niv:a, 'APEC');
    alerte(NIVN[pire], `${nom} et son traitement`, reel.map(x=>`${x.txt.replace(/\.$/,'')} (${NIVT[x.niv]}).`).join(' '), TH);
  };
  O.lignes.forEach(l=>traiter(court(l.med), idsLigne(l)));
  const anesth = !actCI && !['candidose','herpes_primo','herpes_recurrent','aphte','lesion_persistante','sinusite','sialadenite'].includes(m);
  if(anesth) traiter('L’anesthésie locale', ['adre','lido']);
  if(anesth && D.hypo.some(h=>h.classe==='Bêtabloquants')) hypos.push('Bêtabloquants : si propranolol, carvédilol, nadolol ou sotalol (non cardiosélectifs), poussée hypertensive et bradycardie possibles avec l’adrénaline.');
  if(hypos.length) alerte('moy','Précise la molécule', hypos.join(' '), TH);

  /* ---- 5 ter. Réponses « ne sait pas » qui changeraient l'indication [HAS 2026] ---- */
  const doutes = Object.keys(R.A_VERIFIER).filter(k=>at.has(k));
  if(doutes.length && !ria && !actCI){
    const si = 'Si '+doutes.map(k=>R.A_VERIFIER[k]).join(', ou si ');
    if(T && !O.prophy && T.p[1]!=='non') alerte('moy','À vérifier avant le geste', `${si}, le patient est à risque infectieux augmenté : l’antibioprophylaxie est alors ${T.p[1]==='cas'?'à discuter au cas par cas':'recommandée'} pour cet acte.`,'HAS 2026');
    else if(['abces','abces_paro','alveolite_suppuree','periimplantite','mpn'].includes(m) && !O.atb) alerte('moy','À vérifier', `${si}, le patient est à risque infectieux augmenté : un antibiotique devient alors recommandé en complément du geste.`,'HAS 2026');
  }

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
  const ajT = (cl, k, v) => { if(!rep.ttt.includes(cl)) rep.ttt.push(cl); if(k && v){ rep[k] = rep[k]||[]; if(!rep[k].includes(v)) rep[k].push(v); } };
  const ajA = (v, k, val) => { if(!rep.atcd.includes(v)) rep.atcd.push(v); if(k && val!=null && rep[k]==null) rep[k] = val; };
  const hyp = rep._hyp = [];
  // Antithrombotiques
  const aapNoms = new Set((t.match(/kardegic|aspirine|aspegic|resitune|plavix|clopidogrel|brilique|ticagrelor|efient|prasugrel|duoplavin/g)||[]).map(x=>({aspegic:'aspirine',resitune:'aspirine',kardegic:'aspirine',plavix:'clopidogrel',brilique:'ticagrelor',efient:'prasugrel'}[x]||x)));
  if(/eliquis|apixaban|xarelto|rivaroxaban|pradaxa|dabigatran|lixiana|edoxaban|\baod\b/.test(t)) ajT('aod');
  if(/coumadine|warfarine|previscan|fluindione|sintrom|acenocoumarol|\bavk\b/.test(t)) ajT('avk');
  if(/lovenox|enoxaparine|innohep|tinzaparine|fragmine|dalteparine|heparine|\bhbpm\b|arixtra/.test(t)) ajT('heparine');
  if(aapNoms.size || /bitherapie|double anti|antiagregant|antiplaquettaire|\baap\b/.test(t)){
    ajT('antiplaq'); aapNoms.forEach(n=>ajT('antiplaq','m_aap',n));
    rep.p_aap = (aapNoms.size>=2 || aapNoms.has('duoplavin') || /bitherapie|double anti/.test(t)) ? 'bi' : 'mono';
  }
  // Molécules et spécialités citées (classes que le dentiste ne prescrit pas lui-même)
  const PAS_AUTO = ['antiplaq','avk','aod','heparine','ains_c','opioides','cortico_c','antihist'];
  for(const it of plat(R.TTT)){ if(PAS_AUTO.includes(it.v)) continue;
    for(const b of (it.sous||[])) if(b.mol) for(const so of b.options){
      const mots = [N(so.t).replace(/\(.*?\)/g,'').trim(), ...String(so.d).split(/[,·]/).flatMap(x=>x.trim().split(/\s+/)).filter(w=>/^[A-ZÀ-Ý]/.test(w) && w.length>=5).map(w=>N(w))];
      if(mots.some(w=>w.length>=5 && new RegExp('(^|[^a-z])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z])').test(t))) ajT(it.v, b.k, so.v);
    }
  }
  if(/methotrexate|novatrex|metoject|imeth/.test(t)) ajT('mtx');
  // Os : anti-résorbeurs
  if(/xgeva/.test(t)){ ajT('denosumab_c'); rep.p_deno='malin'; }
  else if(/zometa|(bisphosph|\bbp\b).{0,30}(cancer|metast|myelome)|(cancer|metast|myelome).{0,30}bisphosph|zoledron.{0,20}4 ?mg/.test(t)){ ajT('bisphos'); rep.p_bp='malin'; }
  else if(/prolia|denosumab/.test(t)){ ajT('denosumab_c'); rep.p_deno = /plus de 6 mois|> ?6 mois/.test(t) ? 'ancien' : /moins de 6 mois|< ?6 mois/.test(t) ? 'recent' : 'nsp'; }
  else if(/bisphosph|fosamax|alendron|actonel|risedron|bonviva|ibandron|aclasta|zoledron/.test(t)){ ajT('bisphos'); if(/([5-9]|\d\d) ans|plus de 5 ans|depuis longtemps/.test(t)) rep.p_bp='benin5'; else { rep.p_bp='benin'; hyp.push('bisphosphonate pour ostéoporose depuis moins de 5 ans'); } }
  if(/avastin|bevacizumab|sunitinib|sutent|anti-?angio/.test(t)) ajT('antiangio');
  if(/radioth|irradi/.test(t)){ const gy=t.match(/(\d+)\s*gy/); ajT('radiotherapie'); rep.p_radio = gy ? (Number(gy[1])<40 ? 'cf_moins40' : 'cf40') : 'cf_nsp'; }
  // Cœur
  if(/prothese valvul|valve mecanique|valve biologique|\btavi\b|remplacement valvulaire/.test(t)) ajA('valve_prot');
  if(/endocardite/.test(t)) ajA('ei_atcd');
  if(/cyanogene/.test(t)) ajA('cardio_cong','p_cong','cyano');
  if(/assistance ventriculaire/.test(t)) ajA('assist_vent');
  if(/pacemaker|pace-maker|stimulateur|defibrillateur/.test(t)) ajA('pacemaker');
  if(/cardiomyopathie/.test(t)) ajA('cmh');
  if(/valvulopathie|souffle|retrecissement aortique|insuffisance (mitrale|aortique)|bicuspid/.test(t)) ajA('valvulo');
  if(/\bhta\b|hypertension/.test(t)) ajA('hypertension','eq_hta', /desequilibr|mal equilibr|non controle|sever/.test(t) ? 'non_eq' : /equilibr|controle/.test(t) ? 'eq' : 'nsp');
  if(/angor|infarctus|coronar|stent|pontage/.test(t)){ ajA('coronarien'); const pc=[];
    if(/stent/.test(t)){ if(/stent.{0,40}(moins d.un an|moins de (12|6) mois|recent|\b[1-9] mois|\b1[01] mois)/.test(t)) pc.push('stent_recent'); else { pc.push('stent_ancien'); hyp.push('stent posé il y a plus de 12 mois'); } }
    if(/pontage/.test(t)) pc.push('pontage'); if(/infarctus recent|angor instable/.test(t)) pc.push('idm_recent');
    if(pc.length) rep.p_coro = pc; }
  if(/arythmie|fibrillation|trouble du rythme|bloc auriculo/.test(t)) ajA('rythme');
  if(/insuffisan\w* cardiaque/.test(t)) ajA('insuf_card');
  if(/phlebite|embolie pulmonaire|thrombose veineuse/.test(t)) ajA('thrombose');
  if(/\bavc\b|\bait\b|accident vasculaire/.test(t)) ajA('avc');
  if(/qt long/.test(t)) ajA('qt');
  // Diabète et hormones
  if(/diabet/.test(t)) ajA(/type 1|\bdt1\b|insulinodependant/.test(t) ? 'dt1' : 'dt2', /type 1|\bdt1\b|insulinodependant/.test(t) ? 'eq_dt1' : 'eq_dt2',
    /desequilibr|mal equilibr|hba1c\s*(de\s*|a\s*)?(9|1\d)/.test(t) ? 'non_eq' : /equilibr|hba1c\s*(de\s*|a\s*)?[5-8]\b/.test(t) ? 'eq' : 'nsp');
  if(/insuline/.test(t)) ajT('insuline');
  if(/addison|insuffisance surrenal/.test(t)) ajA('surrenal');
  if(/bypass|sleeve|chirurgie bariatrique/.test(t)) ajA('obesite','p_bari', /bypass/.test(t)?'bypass':/sleeve/.test(t)?'sleeve':null);
  // Immunité, cancer
  if(/chimio|aplasi/.test(t)){ ajT('chimio_t'); rep.p_chimio = /aplasi/.test(t) ? 'aplasiante' : /termine|fini|ancienne/.test(t) ? 'terminee' : 'nsp'; }
  if(/neutropen/.test(t)) ajA('neutropenie');
  if(/greff(e|ee)\b.{0,15}(rein|foie|coeur|poumon|organe|moelle)|transplant/.test(t)) ajA('greffe');
  if(/cortico|prednisolone|prednisone|solupred|cortancyl/.test(t) && !/cortico\w* inhal/.test(t)){ ajT('cortico_c'); rep.p_cortico = /(forte dose|long cours|au long|depuis (des|plusieurs) (mois|annees))/.test(t) ? 'fort' : 'nsp'; }
  if(/biotherap|humira|adalimumab|enbrel|remicade|infliximab|anti-?tnf/.test(t)) ajT('biotherapie');
  if(/immunosupp|immunomodul/.test(t)) ajT('immunosup');
  if(/\bvih\b|\bsida\b/.test(t)) ajA('vih_p','p_vih', /cd4.{0,15}(<|inferieur|moins de|sous) ?200/.test(t) ? 'bas' : /cd4.{0,15}(>|superieur|plus de) ?200/.test(t) ? 'ok' : 'nsp');
  if(/splenectom|asplen|rate (retiree|enlevee)/.test(t)) ajA('splenectomie','p_asplenie', /moins de [1-5] ans/.test(t) ? 'recent' : /plus de 5 ans/.test(t) ? 'ancien' : 'nsp');
  if(/remission/.test(t)) ajA('cancer','p_k_etat','remission'); else if(/cancer|tumeur|lymphome|leucemie|myelome/.test(t)) ajA('cancer','p_k_etat','en_cours');
  if(/osteonecrose/.test(t) && /(antecedent|deja eu|ancienne)/.test(t)) ajA('onm_atcd');
  // Reins, foie, digestif
  if(/dialys/.test(t)) ajA('ir','p_ir','dialyse'); else if(/insuffisan\w* renal/.test(t)) ajA('ir','p_ir', /sever|terminal|dfg ?< ?30/.test(t)?'severe':'moderee');
  if(/cirrhose|insuffisan\w* hepat/.test(t)) ajA('hepatique','p_ih', /sever|cirrhose/.test(t)?'severe':'moderee');
  if(/alcool/.test(t) && !/sans alcool/.test(t)) ajA('alcool');
  if(/ulcere|hemorragie digest/.test(t)) ajA('ulcere');
  if(/crohn|rectocolite|\bmici\b|\brch\b/.test(t)) ajA('mici','p_mici', /crohn/.test(t)?'crohn':/rectocolite|\brch\b/.test(t)?'rch':null);
  // Inflammation, poumons, neurologie
  if(/polyarthrite/.test(t)) ajA('pr');
  if(/spondyl/.test(t)) ajA('spa');
  if(/lupus/.test(t)) ajA('lupus');
  if(/sjogren/.test(t)) ajA('sjogren');
  if(/asthm/.test(t)) ajA('asthme');
  if(/bpco|emphyseme pulm|bronchite chronique/.test(t)) ajA('bpco');
  if(/drepanocyt/.test(t)) ajA('drepano');
  if(/hemophil/.test(t)) ajA('hemophilie');
  if(/willebrand/.test(t)) ajA('willebrand');
  if(/deficit en facteur|deficit facteur/.test(t)) ajA('deficit_facteur');
  if(/thrombopeni|thrombopathi|plaquettes? bass|\bpti\b/.test(t)) ajA('thrombopenie');
  if(/epilep|convuls/.test(t)) ajA('epilepsie');
  if(/parkinson/.test(t)) ajA('parkinson');
  if(/sclerose en plaques/.test(t)) ajA('sep');
  if(/alzheimer|demence/.test(t)) ajA('demence');
  if(/glaucome/.test(t)) ajA('glaucome');
  if(/prostat|retention urinaire/.test(t)) ajA('prostate');
  if(/porphyri/.test(t)) ajA('porphyrie');
  if(/tabac|fumeu|cigarette/.test(t)) ajA('tabac');
  if(/prothese (de hanche|de genou|articulaire)/.test(t)) ajA('prothese_art');
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
