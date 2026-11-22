/* =====================================================================
   Drill — Scanner d'ordonnance : base médicaments et règles
   ---------------------------------------------------------------------
   Sources :
   - Thésaurus des interactions médicamenteuses ANSM, version du 15/09/2023
     (dernière version, consultable jusqu'au 15/06/2027 ; l'ANSM renvoie
     désormais aux RCP).
   - RCP ANSM : Flagyl (métronidazole), Alphacaine SP (articaïne adrénalinée).
   - HAS 2026 (antibiotiques en odontologie), SFCO 2015 (antithrombotiques).
   Niveaux : CI contre-indication, ASDEC association déconseillée,
   PE précaution d'emploi, APEC à prendre en compte.
   ===================================================================== */
(function(){
const S = {};
const TH = 'Thésaurus ANSM 2023';
const N = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’'`]/g,' ');

/* ---------- 1. Base : [DCI, classe, tags, marques] ---------- */
const BASE = [
  // Antithrombotiques
  ['Apixaban','Anticoagulant oral direct','aod anticoag','eliquis'],
  ['Rivaroxaban','Anticoagulant oral direct','aod anticoag','xarelto'],
  ['Dabigatran','Anticoagulant oral direct','aod anticoag','pradaxa'],
  ['Édoxaban','Anticoagulant oral direct','aod anticoag','lixiana'],
  ['Warfarine','Antivitamine K','avk anticoag','coumadine'],
  ['Fluindione','Antivitamine K','avk anticoag','previscan'],
  ['Acénocoumarol','Antivitamine K','avk anticoag','sintrom,minisintrom'],
  ['Énoxaparine','Héparine de bas poids moléculaire','heparine','lovenox'],
  ['Tinzaparine','Héparine de bas poids moléculaire','heparine','innohep'],
  ['Daltéparine','Héparine de bas poids moléculaire','heparine','fragmine'],
  ['Nadroparine','Héparine de bas poids moléculaire','heparine','fraxiparine,fraxodi'],
  ['Fondaparinux','Anticoagulant injectable','heparine','arixtra'],
  ['Héparine calcique','Héparine non fractionnée','heparine','calciparine'],
  ['Aspirine (dose antiagrégante)','Antiagrégant plaquettaire','aap aspirine','kardegic,resitune,aspirine protect,aspirine upsa 100,aspirine 75,aspirine 100,aspirine 160,aspirine 300'],
  ['Clopidogrel','Antiagrégant plaquettaire','aap','plavix'],
  ['Clopidogrel + aspirine','Bithérapie antiagrégante','aap aap_double aspirine','duoplavin'],
  ['Prasugrel','Antiagrégant plaquettaire','aap','efient'],
  ['Ticagrelor','Antiagrégant plaquettaire','aap ticagrelor','brilique'],
  ['Ticlopidine','Antiagrégant plaquettaire','aap','ticlid'],
  ['Dipyridamole + aspirine','Antiagrégant plaquettaire','aap aspirine','asasantine'],

  // Diabète
  ['Insuline','Insuline','antidiab insuline','lantus,toujeo,abasaglar,levemir,tresiba,novorapid,humalog,apidra,fiasp,lyumjev,humulin,insulatard,novomix,umuline,actrapid,xultophy,suliqua'],
  ['Metformine','Antidiabétique (biguanide)','antidiab metformine','glucophage,stagid'],
  ['Metformine + gliptine','Antidiabétique','antidiab metformine','janumet,velmetia,eucreas,komboglyze,jentadueto'],
  ['Metformine + gliflozine','Antidiabétique','antidiab metformine','xigduo,synjardy'],
  ['Gliclazide','Sulfamide hypoglycémiant','antidiab sulfamide','diamicron'],
  ['Glimépiride','Sulfamide hypoglycémiant','antidiab sulfamide','amarel'],
  ['Glibenclamide','Sulfamide hypoglycémiant','antidiab sulfamide','daonil,hemi-daonil,glucovance'],
  ['Glipizide','Sulfamide hypoglycémiant','antidiab sulfamide','glibenese,minidiab,ozidia'],
  ['Répaglinide','Antidiabétique (glinide)','antidiab repaglinide','novonorm'],
  ['Sitagliptine','Antidiabétique (gliptine)','antidiab','januvia,xelevia'],
  ['Vildagliptine','Antidiabétique (gliptine)','antidiab','galvus'],
  ['Saxagliptine','Antidiabétique (gliptine)','antidiab','onglyza'],
  ['Linagliptine','Antidiabétique (gliptine)','antidiab','trajenta'],
  ['Sémaglutide','Analogue du GLP-1','antidiab glp1','ozempic,rybelsus,wegovy'],
  ['Dulaglutide','Analogue du GLP-1','antidiab glp1','trulicity'],
  ['Liraglutide','Analogue du GLP-1','antidiab glp1','victoza,saxenda'],
  ['Tirzépatide','Analogue du GLP-1/GIP','antidiab glp1','mounjaro'],
  ['Exénatide','Analogue du GLP-1','antidiab glp1','byetta,bydureon'],
  ['Dapagliflozine','Antidiabétique (gliflozine)','antidiab','forxiga'],
  ['Empagliflozine','Antidiabétique (gliflozine)','antidiab','jardiance'],

  // Cardiovasculaire
  ['Ramipril','IEC','iec antihta','triatec,cotriatec'],
  ['Périndopril','IEC','iec antihta','coversyl,bipreterax,preterax,coveram,triplixam,cosimprel'],
  ['Énalapril','IEC','iec antihta','renitec,co-renitec,lercapress'],
  ['Lisinopril','IEC','iec antihta','zestril,prinivil,zestoretic'],
  ['Captopril','IEC','iec antihta','lopril'],
  ['Trandolapril','IEC','iec antihta','odrik,tarka'],
  ['Bénazépril','IEC','iec antihta','cibacene,briazide'],
  ['Losartan','Antagoniste de l’angiotensine II','ara2 antihta','cozaar,hyzaar'],
  ['Valsartan','Antagoniste de l’angiotensine II','ara2 antihta','tareg,nisis,cotareg,nisisco,exforge'],
  ['Irbésartan','Antagoniste de l’angiotensine II','ara2 antihta','aprovel,coaprovel'],
  ['Candésartan','Antagoniste de l’angiotensine II','ara2 antihta','atacand,kenzen,cokenzen,hytacand'],
  ['Olmésartan','Antagoniste de l’angiotensine II','ara2 antihta','alteis,olmetec,axeler,sevikar,coolmetec'],
  ['Telmisartan','Antagoniste de l’angiotensine II','ara2 antihta','micardis,pritor,micardisplus'],
  ['Sacubitril + valsartan','Insuffisance cardiaque','ara2 ic','entresto'],
  ['Furosémide','Diurétique de l’anse','diuretique antihta','lasilix'],
  ['Bumétanide','Diurétique de l’anse','diuretique antihta','burinex'],
  ['Hydrochlorothiazide','Diurétique thiazidique','diuretique antihta','esidrex'],
  ['Indapamide','Diurétique thiazidique','diuretique antihta','fludex'],
  ['Spironolactone','Diurétique épargneur de potassium','diuretique antihta','aldactone,aldactazine'],
  ['Éplérénone','Antagoniste de l’aldostérone','diuretique eplerenone ic','inspra'],
  ['Bisoprolol','Bêta-bloquant','betabloquant antihta','cardensiel,detensiel,bisoce,lodoz,wytens'],
  ['Nébivolol','Bêta-bloquant','betabloquant antihta','temerit,nebilox'],
  ['Aténolol','Bêta-bloquant','betabloquant antihta','tenormine,tenoretic'],
  ['Métoprolol','Bêta-bloquant','betabloquant antihta','lopressor,seloken,logimax'],
  ['Propranolol','Bêta-bloquant','betabloquant antihta','avlocardyl,hemangiol'],
  ['Carvédilol','Bêta-bloquant','betabloquant antihta','kredex'],
  ['Acébutolol','Bêta-bloquant','betabloquant antihta','sectral'],
  ['Sotalol','Bêta-bloquant antiarythmique','betabloquant antiarythmique qt','sotalex'],
  ['Amlodipine','Inhibiteur calcique','ica antihta hyperplasie','amlor,exforge,coveram,sevikar,caduet,axeler'],
  ['Nifédipine','Inhibiteur calcique','ica antihta hyperplasie','adalate,chronadalate'],
  ['Félodipine','Inhibiteur calcique','ica antihta hyperplasie','flodil,logimax'],
  ['Nicardipine','Inhibiteur calcique','ica antihta hyperplasie','loxen'],
  ['Lercanidipine','Inhibiteur calcique','lercanidipine antihta hyperplasie','zanidip,lercan,lercapress'],
  ['Diltiazem','Inhibiteur calcique','ica antihta hyperplasie','tildiem,mono-tildiem,bi-tildiem'],
  ['Vérapamil','Inhibiteur calcique','verapamil antihta hyperplasie','isoptine,tarka'],
  ['Amiodarone','Antiarythmique','antiarythmique qt amiodarone','cordarone'],
  ['Dronédarone','Antiarythmique','antiarythmique dronedarone','multaq'],
  ['Flécaïnide','Antiarythmique','antiarythmique','flecaine'],
  ['Digoxine','Digitalique','digoxine','hemigoxine'],
  ['Ivabradine','Anti-angoreux','ivabradine','procoralan'],
  ['Nicorandil','Anti-angoreux','nicorandil angor','adancor,ikorel'],
  ['Trinitrine','Dérivé nitré','angor','natispray,trinipatch,nitriderm,discotrine,diafusor'],
  ['Isosorbide dinitrate','Dérivé nitré','angor','risordan,langoran'],
  ['Ranolazine','Anti-angoreux','ranolazine angor','ranexa'],
  ['Clonidine','Antihypertenseur central','antihta xerostomie','catapressan'],
  ['Simvastatine','Statine','simva statine','zocor,inegy'],
  ['Atorvastatine','Statine','atorva statine','tahor,caduet'],
  ['Pravastatine','Statine','prava statine','elisor,vasten'],
  ['Rosuvastatine','Statine','statine','crestor,fortzaar'],
  ['Fénofibrate','Fibrate','fibrate','lipanthyl,fegenor,secalip'],
  ['Ézétimibe','Hypolipémiant','','ezetrol'],

  // Psychiatrie, neurologie
  ['Sertraline','Antidépresseur ISRS','isrs xerostomie','zoloft'],
  ['Fluoxétine','Antidépresseur ISRS','isrs cyp2d6 xerostomie','prozac'],
  ['Paroxétine','Antidépresseur ISRS','isrs cyp2d6 xerostomie','deroxat,divarius'],
  ['Citalopram','Antidépresseur ISRS','isrs qt xerostomie','seropram'],
  ['Escitalopram','Antidépresseur ISRS','isrs qt xerostomie','seroplex'],
  ['Fluvoxamine','Antidépresseur ISRS','isrs fluvoxamine xerostomie','floxyfral'],
  ['Venlafaxine','Antidépresseur IRSNA','irsna venlafaxine xerostomie','effexor'],
  ['Duloxétine','Antidépresseur IRSNA','irsna cyp2d6 xerostomie','cymbalta'],
  ['Milnacipran','Antidépresseur IRSNA','irsna xerostomie','ixel'],
  ['Amitriptyline','Antidépresseur tricyclique','tricyclique xerostomie','laroxyl,elavil'],
  ['Clomipramine','Antidépresseur tricyclique','tricyclique xerostomie','anafranil'],
  ['Imipramine','Antidépresseur tricyclique','tricyclique xerostomie','tofranil'],
  ['Doxépine','Antidépresseur tricyclique','tricyclique xerostomie','quitaxon'],
  ['Mirtazapine','Antidépresseur','xerostomie','norset'],
  ['Miansérine','Antidépresseur','xerostomie',''],
  ['Agomélatine','Antidépresseur','','valdoxan,thymanax'],
  ['Vortioxétine','Antidépresseur','','brintellix'],
  ['Bupropion','Sevrage tabagique, antidépresseur','cyp2d6','zyban'],
  ['Iproniazide','IMAO non sélectif','imao','marsilid'],
  ['Moclobémide','IMAO-A','imao_a','moclamine'],
  ['Rasagiline','IMAO-B (Parkinson)','imao_b','azilect'],
  ['Sélégiline','IMAO-B (Parkinson)','imao_b','deprenyl,otrasel'],
  ['Safinamide','IMAO-B (Parkinson)','imao_b','xadago'],
  ['Lithium','Thymorégulateur','lithium','teralithe'],
  ['Halopéridol','Antipsychotique','qt xerostomie','haldol'],
  ['Amisulpride','Antipsychotique','qt xerostomie','solian'],
  ['Cyamémazine','Antipsychotique','qt xerostomie','tercian'],
  ['Chlorpromazine','Antipsychotique','qt xerostomie','largactil'],
  ['Lévomépromazine','Antipsychotique','qt xerostomie','nozinan'],
  ['Sulpiride','Antipsychotique','qt','dogmatil'],
  ['Tiapride','Antipsychotique','qt','tiapridal'],
  ['Loxapine','Antipsychotique','xerostomie','loxapac'],
  ['Olanzapine','Antipsychotique','xerostomie','zyprexa,zypadhera'],
  ['Rispéridone','Antipsychotique','xerostomie','risperdal'],
  ['Aripiprazole','Antipsychotique','','abilify'],
  ['Quétiapine','Antipsychotique','quetiapine xerostomie','xeroquel'],
  ['Lurasidone','Antipsychotique','lurasidone',''],
  ['Pimozide','Antipsychotique','pimozide qt','orap'],
  ['Clozapine','Antipsychotique','clozapine','leponex'],
  ['Alprazolam','Benzodiazépine','benzo alprazolam xerostomie','xanax'],
  ['Bromazépam','Benzodiazépine','benzo xerostomie','lexomil'],
  ['Lorazépam','Benzodiazépine','benzo xerostomie','temesta'],
  ['Oxazépam','Benzodiazépine','benzo xerostomie','seresta'],
  ['Diazépam','Benzodiazépine','benzo xerostomie','valium'],
  ['Clonazépam','Benzodiazépine','benzo antiepi','rivotril'],
  ['Prazépam','Benzodiazépine','benzo xerostomie','lysanxia'],
  ['Clorazépate','Benzodiazépine','benzo xerostomie','tranxene'],
  ['Zolpidem','Hypnotique','benzo hypnotique','stilnox'],
  ['Zopiclone','Hypnotique','benzo hypnotique','imovane'],
  ['Hydroxyzine','Anxiolytique antihistaminique','qt xerostomie','atarax'],
  ['Valproate','Antiépileptique','antiepi valproate','depakine,depakote,depamide,micropakine'],
  ['Carbamazépine','Antiépileptique','antiepi inducteur carbamazepine','tegretol'],
  ['Oxcarbazépine','Antiépileptique','antiepi','trileptal'],
  ['Phénytoïne','Antiépileptique','antiepi inducteur phenytoine hyperplasie','di-hydan,dilantin'],
  ['Phénobarbital','Antiépileptique','antiepi inducteur','gardenal,kaneuron'],
  ['Primidone','Antiépileptique','antiepi inducteur','mysoline'],
  ['Lamotrigine','Antiépileptique','antiepi','lamictal'],
  ['Lévétiracétam','Antiépileptique','antiepi','keppra'],
  ['Topiramate','Antiépileptique','antiepi','epitomax'],
  ['Lacosamide','Antiépileptique','antiepi','vimpat'],
  ['Prégabaline','Antiépileptique, douleur neuropathique','xerostomie','lyrica'],
  ['Gabapentine','Antiépileptique, douleur neuropathique','','neurontin'],
  ['Lévodopa','Antiparkinsonien','parkinson','modopar,sinemet,stalevo'],
  ['Bromocriptine','Agoniste dopaminergique (dérivé de l’ergot)','ergot_dopa','parlodel'],
  ['Cabergoline','Agoniste dopaminergique (dérivé de l’ergot)','ergot_dopa','dostinex'],
  ['Dihydroergotamine','Dérivé de l’ergot','ergot',''],
  ['Donépézil','Anticholinestérasique','','aricept'],
  ['Méthylphénidate','Psychostimulant','xerostomie','ritaline,concerta,quasym,medikinet'],

  // Douleur, substitution
  ['Paracétamol','Antalgique','paracetamol','doliprane,dafalgan,efferalgan,dolko,paralyoc,dolipranetabs'],
  ['Tramadol','Antalgique opioïde','morphinique','topalgic,contramal,monoalgic,zamudol,orozamudol'],
  ['Tramadol + paracétamol','Antalgique opioïde','morphinique paracetamol','ixprim,zaldiar'],
  ['Codéine + paracétamol','Antalgique opioïde','morphinique paracetamol','dafalgan codeine,codoliprane,klipal'],
  ['Opium + paracétamol','Antalgique opioïde','morphinique paracetamol','izalgi,lamaline'],
  ['Morphine','Antalgique opioïde','morphinique xerostomie','skenan,actiskenan,oramorph,moscontin'],
  ['Oxycodone','Antalgique opioïde','morphinique oxycodone xerostomie','oxycontin,oxynorm,oxynormoro'],
  ['Fentanyl','Antalgique opioïde','morphinique fentanyl','durogesic,abstral,instanyl,effentora,recivit'],
  ['Méthadone','Traitement de substitution aux opiacés','morphinique qt substitution','methadone'],
  ['Buprénorphine','Traitement de substitution aux opiacés','morph_aa substitution','subutex,orobupre,suboxone,buvidal'],
  ['Nalbuphine','Antalgique (agoniste-antagoniste)','morph_aa',''],
  ['Néfopam','Antalgique','','acupan'],
  ['Ibuprofène','Anti-inflammatoire non stéroïdien','ains','advil,nurofen,spedifen,antarene,brufen,upfen'],
  ['Kétoprofène','Anti-inflammatoire non stéroïdien','ains','profenid,bi-profenid,ketum'],
  ['Naproxène','Anti-inflammatoire non stéroïdien','ains','apranax,naprosyne,antalnox,alleve'],
  ['Diclofénac','Anti-inflammatoire non stéroïdien','ains','voltarene,flector,xenid,artotec'],
  ['Célécoxib','Anti-inflammatoire non stéroïdien','ains','celebrex'],
  ['Étoricoxib','Anti-inflammatoire non stéroïdien','ains','arcoxia'],
  ['Piroxicam','Anti-inflammatoire non stéroïdien','ains','feldene,brexin'],
  ['Méloxicam','Anti-inflammatoire non stéroïdien','ains','mobic'],
  ['Acide niflumique','Anti-inflammatoire non stéroïdien','ains','nifluril'],
  ['Aspirine (dose antalgique)','Aspirine à dose antalgique','ains aspirine_forte','aspegic,aspro,aspirine du rhone,aspirine 500,aspirine 1000'],

  // Corticoïdes, respiratoire
  ['Prednisone','Corticoïde oral','cortico_os','cortancyl'],
  ['Prednisolone','Corticoïde oral','cortico_os','solupred'],
  ['Méthylprednisolone','Corticoïde oral','cortico_os','medrol,solumedrol'],
  ['Dexaméthasone','Corticoïde oral','cortico_os','dectancyl,neofordex'],
  ['Bétaméthasone','Corticoïde oral','cortico_os','celestene,betnesol'],
  ['Hydrocortisone','Corticoïde (substitution)','hydrocortisone',''],
  ['Budésonide inhalé','Corticoïde inhalé','cortico_inh cortico_inh_metab','pulmicort,symbicort,trimbow'],
  ['Fluticasone inhalée','Corticoïde inhalé','cortico_inh cortico_inh_metab','flixotide,seretide,relvar,trelegy,flutiform,revinty,avamys'],
  ['Béclométasone inhalée','Corticoïde inhalé','cortico_inh','becotide,qvar,innovair,formodual,beclojet'],
  ['Salbutamol','Bronchodilatateur','respi','ventoline,airomir,asmasal'],
  ['Terbutaline','Bronchodilatateur','respi','bricanyl'],
  ['Tiotropium','Bronchodilatateur','respi xerostomie','spiriva'],
  ['Montélukast','Antiasthmatique','respi','singulair'],
  ['Théophylline','Bronchodilatateur','theophylline','theostat'],

  // Immunité, rhumatologie
  ['Méthotrexate','Immunosuppresseur / antifolique','mtx immunosup ulcerations','novatrex,metoject,imeth,nordimet'],
  ['Ciclosporine','Immunosuppresseur (anti-rejet)','antirejet is_cyp immunosup ciclosporine hyperplasie','neoral,sandimmun'],
  ['Tacrolimus','Immunosuppresseur (anti-rejet)','antirejet is_cyp immunosup tacrolimus','prograf,advagraf,envarsus,modigraf'],
  ['Évérolimus (Certican)','Immunosuppresseur (anti-rejet)','antirejet is_cyp immunosup','certican'],
  ['Évérolimus (Afinitor)','Thérapie ciblée (cancer)','is_cyp chimio','afinitor,votubia'],
  ['Sirolimus','Immunosuppresseur (anti-rejet)','antirejet is_cyp immunosup','rapamune'],
  ['Mycophénolate','Immunosuppresseur','immunosup mycophenolate','cellcept,myfortic'],
  ['Azathioprine','Immunosuppresseur','immunosup','imurel'],
  ['Léflunomide','Immunomodulateur','immunosup','arava'],
  ['Hydroxychloroquine','Antipaludéen de synthèse','qt','plaquenil'],
  ['Adalimumab','Biothérapie anti-TNF','immunosup','humira,hulio,amgevita,hyrimoz,idacio,imraldi,yuflyma'],
  ['Étanercept','Biothérapie anti-TNF','immunosup','enbrel,benepali,erelzi'],
  ['Infliximab','Biothérapie anti-TNF','immunosup','remicade,inflectra,remsima,flixabi,zessly'],
  ['Certolizumab','Biothérapie anti-TNF','immunosup','cimzia'],
  ['Golimumab','Biothérapie anti-TNF','immunosup','simponi'],
  ['Tocilizumab','Biothérapie','immunosup','roactemra'],
  ['Abatacept','Biothérapie','immunosup','orencia'],
  ['Rituximab','Biothérapie','immunosup','mabthera,truxima,rixathon'],
  ['Ustékinumab','Biothérapie','immunosup','stelara'],
  ['Sécukinumab','Biothérapie','immunosup','cosentyx'],
  ['Ixékizumab','Biothérapie','immunosup','taltz'],
  ['Guselkumab','Biothérapie','immunosup','tremfya'],
  ['Risankizumab','Biothérapie','immunosup','skyrizi'],
  ['Védolizumab','Biothérapie','immunosup','entyvio'],
  ['Tofacitinib','Inhibiteur de JAK','immunosup','xeljanz'],
  ['Baricitinib','Inhibiteur de JAK','immunosup','olumiant'],
  ['Upadacitinib','Inhibiteur de JAK','immunosup','rinvoq'],
  ['Colchicine','Antigoutteux','colchicine','colchimax,colchicine opocalcium'],
  ['Allopurinol','Antigoutteux','allopurinol','zyloric'],
  ['Fébuxostat','Antigoutteux','','adenuric'],

  // Os, cancer
  ['Alendronate','Bisphosphonate (ostéoporose)','bp_os','fosamax,fosavance,adrovance'],
  ['Risédronate','Bisphosphonate (ostéoporose)','bp_os','actonel'],
  ['Ibandronate','Bisphosphonate (ostéoporose)','bp_os','bonviva'],
  ['Zolédronate (Aclasta)','Bisphosphonate (ostéoporose)','bp_os','aclasta'],
  ['Zolédronate (Zometa)','Bisphosphonate (cancer)','bp_malin','zometa'],
  ['Pamidronate','Bisphosphonate (cancer)','bp_malin','aredia,ostepam'],
  ['Clodronate','Bisphosphonate (cancer)','bp_malin','clastoban'],
  ['Dénosumab (Prolia)','Anti-résorptif (ostéoporose)','denosumab_os','prolia'],
  ['Dénosumab (Xgeva)','Anti-résorptif (cancer)','denosumab_malin','xgeva'],
  ['Romosozumab','Ostéoporose','romosozumab','evenity'],
  ['Bévacizumab','Anti-angiogénique','antiangio','avastin,mvasi,zirabev,aybintio'],
  ['Sunitinib','Anti-angiogénique','antiangio','sutent'],
  ['Sorafénib','Anti-angiogénique','antiangio','nexavar'],
  ['Pazopanib','Anti-angiogénique','antiangio','votrient'],
  ['Axitinib','Anti-angiogénique','antiangio','inlyta'],
  ['Cabozantinib','Anti-angiogénique','antiangio','cabometyx,cometriq'],
  ['Lenvatinib','Anti-angiogénique','antiangio','lenvima,kisplyx'],
  ['Régorafénib','Anti-angiogénique','antiangio','stivarga'],
  ['Aflibercept (cancer)','Anti-angiogénique','antiangio','zaltrap'],
  ['Ramucirumab','Anti-angiogénique','antiangio','cyramza'],
  ['Capécitabine','Chimiothérapie orale','fluoropyr chimio','xeloda'],
  ['Fluorouracile','Chimiothérapie','fluoropyr chimio','5-fu'],
  ['Busulfan','Chimiothérapie','busulfan chimio','myleran,busilvex'],
  ['Tamoxifène','Hormonothérapie (cancer du sein)','tamoxifene','nolvadex'],
  ['Létrozole','Hormonothérapie (cancer du sein)','hormono_k','femara'],
  ['Anastrozole','Hormonothérapie (cancer du sein)','hormono_k','arimidex'],
  ['Exémestane','Hormonothérapie (cancer du sein)','hormono_k','aromasine'],

  // Infectiologie, VIH
  ['Ritonavir','Antirétroviral (booster)','arv ritonavir','norvir,kaletra,paxlovid'],
  ['Cobicistat','Antirétroviral (booster)','arv ritonavir','genvoya,stribild,symtuza,rezolsta,tybost,prezcobix'],
  ['Darunavir','Antirétroviral','arv','prezista'],
  ['Bictégravir','Antirétroviral','arv','biktarvy'],
  ['Dolutégravir','Antirétroviral','arv','tivicay,triumeq,dovato,juluca'],
  ['Ténofovir disoproxil','Antirétroviral','arv tenofovir','viread,truvada,eviplera,atripla'],
  ['Rifampicine','Antibiotique antituberculeux','inducteur rifampicine','rifadine,rimactan,rifinah,rifater'],
  ['Terbinafine','Antifongique','cyp2d6','lamisil'],
  ['Fluconazole','Antifongique azolé','fluconazole','triflucan'],

  // Autres
  ['Lévothyroxine','Hormone thyroïdienne','','levothyrox,l-thyroxine,tcaps,thyrofix'],
  ['Oméprazole','Inhibiteur de la pompe à protons','ipp','mopral'],
  ['Ésoméprazole','Inhibiteur de la pompe à protons','ipp','inexium'],
  ['Pantoprazole','Inhibiteur de la pompe à protons','ipp','inipomp,eupantol'],
  ['Lansoprazole','Inhibiteur de la pompe à protons','ipp','lanzor,ogast'],
  ['Rabéprazole','Inhibiteur de la pompe à protons','ipp','pariet'],
  ['Antiacide ou pansement gastrique','Topique gastro-intestinal','antiacide','gaviscon,maalox,smecta,ulcar,sucralfate,xolaam,rennie,phosphalugel'],
  ['Dompéridone','Antiémétique','domperidone qt','motilium'],
  ['Métoclopramide','Antiémétique','','primperan'],
  ['Ondansétron','Antiémétique','ondansetron','zophren'],
  ['Disulfirame','Sevrage alcoolique','disulfirame alcool','esperal'],
  ['Acamprosate','Sevrage alcoolique','alcool','aotal'],
  ['Naltrexone','Sevrage alcoolique','alcool','revia'],
  ['Baclofène','Myorelaxant, sevrage alcoolique','','lioresal,baclocur'],
  ['Cinacalcet','Hyperparathyroïdie','cyp2d6','mimpara'],
  ['Oxybutynine','Antispasmodique urinaire','xerostomie','ditropan,driptane'],
  ['Solifénacine','Antispasmodique urinaire','xerostomie','vesicare'],
  ['Tamsulosine','Alphabloquant (prostate)','alphab','omix,josir,mecir,combodart'],
  ['Alfuzosine','Alphabloquant (prostate)','alphab','xatral,urion'],
  ['Silodosine','Alphabloquant (prostate)','alphab','silodyx,urorec'],
  ['Sildénafil','Inhibiteur de la PDE5','pde5','viagra,revatio'],
  ['Tadalafil','Inhibiteur de la PDE5','pde5','cialis,adcirca'],
  ['Cétirizine','Antihistaminique','xerostomie','virlix,zyrtec'],
  ['Desloratadine','Antihistaminique','','aerius'],
  ['Méquitazine','Antihistaminique','qt xerostomie','primalan'],
  ['Millepertuis','Phytothérapie','millepertuis inducteur','procalmil,mildac'],
];

/* ---------- 2. Index et détection ---------- */
const LISTE = BASE.map(([dci,classe,tags,marques],i)=>({id:i, dci, classe, tags:new Set(tags.split(/\s+/).filter(Boolean)),
  mots:[N(dci).replace(/\(.*\)/,'').trim(), ...marques.split(',').map(m=>N(m).trim()).filter(Boolean)]}));
// DCI génériques supplémentaires (dénominations courtes)
const ALIAS = {'aspirine':'Aspirine (dose antiagrégante)','acide acetylsalicylique':'Aspirine (dose antiagrégante)','alendronique':'Alendronate','risedronique':'Risédronate','ibandronique':'Ibandronate','zoledronique':'Zolédronate (Aclasta)','denosumab':'Dénosumab (Prolia)','paracetamol':'Paracétamol','insuline':'Insuline','heparine':'Héparine calcique','budesonide':'Budésonide inhalé','fluticasone':'Fluticasone inhalée','beclometasone':'Béclométasone inhalée','valproique':'Valproate','acide valproique':'Valproate','divalproate':'Valproate','opium':'Opium + paracétamol','aflibercept':'Aflibercept (cancer)','codeine':'Codéine + paracétamol','enoxaparine':'Énoxaparine','tinzaparine':'Tinzaparine','acide zoledronique':'Zolédronate (Aclasta)','lithium':'Lithium','acide mycophenolique':'Mycophénolate','mycophenolique':'Mycophénolate','methylprednisolone':'Méthylprednisolone','prednisolone':'Prednisolone'};
const parNom = Object.fromEntries(LISTE.map(m=>[m.dci,m]));
const echap = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

S.reconnaitre = function(texte){
  const t = ' '+N(texte)+' ';
  const vus = new Map();
  const essai = (m, mot) => { const rx = new RegExp('(^|[^a-z0-9])'+echap(mot)+'(?![a-z])'); if(rx.test(t) && !vus.has(m.id)) vus.set(m.id, m); };
  for(const m of LISTE) for(const mot of m.mots) if(mot.length>=4) essai(m, mot);
  for(const [a,d] of Object.entries(ALIAS)) if(new RegExp('(^|[^a-z])'+echap(a)+'(?![a-z])').test(t) && parNom[d]) essai(parNom[d], a);
  let res = [...vus.values()];
  // Aspirine : dose ≥ 500 mg = dose antalgique
  if(res.some(m=>m.dci.startsWith('Aspirine (dose antiagrégante)')) && /aspirine[^\n]{0,25}(500|1000|1 ?g)/.test(t)){
    res = res.filter(m=>m.dci!=='Aspirine (dose antiagrégante)'); if(!res.includes(parNom['Aspirine (dose antalgique)'])) res.push(parNom['Aspirine (dose antalgique)']);
  }
  // Zolédronate 4 mg et dénosumab 120 mg = doses oncologiques
  const swap=(de,vers,rx)=>{ if(res.some(m=>m.dci===de) && rx.test(t)){ res=res.filter(m=>m.dci!==de); if(!res.includes(parNom[vers])) res.push(parNom[vers]); } };
  swap('Zolédronate (Aclasta)','Zolédronate (Zometa)',/zoledron[^\n]{0,40}\b4 ?mg/);
  swap('Dénosumab (Prolia)','Dénosumab (Xgeva)',/denosumab[^\n]{0,40}\b120 ?mg|120 ?mg[^\n]{0,40}denosumab/);
  // Une spécialité combinée efface ses composants détectés par la DCI
  if(res.some(m=>m.dci==='Clopidogrel + aspirine')) res = res.filter(m=>!['Clopidogrel','Aspirine (dose antiagrégante)'].includes(m.dci));
  return res;
};

/* ---------- 2 bis. Toutes les spécialités françaises (BDPM, ANSM) ---------- */
let BD = null;
const cleTok = s => N(s).replace(/[^a-z0-9]+/g,' ').trim();
S.chargerBDPM = async function(){
  if(BD) return BD;
  const j = await (await fetch('bdpm.json')).json();
  const noms = new Map(); for(const [k,sub,cis] of j.noms) noms.set(cleTok(k), {nom:k, subs:sub?sub.split('|'):[], cis});
  const dci = new Map(); for(const [d,cis] of j.dci) dci.set(cleTok(d), {nom:d, subs:[d], cis});
  BD = {noms, dci, date:j.date}; return BD;
};
S.dateBDPM = () => BD ? BD.date : '';
const MOTS_VIDES = new Set(['comprime','comprimes','gelule','gelules','sachet','sachets','matin','midi','soir','jour','fois','par','pendant','boite','cp','gel','creme','solution','sirop','suspension','injectable','collyre','pommade']);
S.identifier = function(ligne){
  const toks = cleTok(ligne).split(' ').filter(Boolean);
  let spe = null;
  if(BD){
    for(let i=0; i<Math.min(2,toks.length) && !spe; i++){
      for(let n=Math.min(5,toks.length-i); n>=1 && !spe; n--){
        const k = toks.slice(i,i+n).join(' ');
        if(/^\d/.test(k) || (n===1 && (k.length<4 || MOTS_VIDES.has(k)))) continue;
        spe = BD.noms.get(k) || BD.dci.get(k) || null;
      }
    }
    if(!spe){ // DCI citée n'importe où dans la ligne (ex. « acide folique 5 mg »)
      for(let n=3; n>=1 && !spe; n--) for(let i=0; i+n<=toks.length && !spe; i++){ const k=toks.slice(i,i+n).join(' '); if(k.length>=5 && !MOTS_VIDES.has(k)) spe = BD.dci.get(k) || null; }
    }
  }
  const meds = S.reconnaitre(ligne + (spe ? ' '+spe.nom+' '+spe.subs.join(' ') : ''));
  return {spe, meds};
};
S.titre = s => s.toLowerCase().replace(/(^|[\s\-'’(])([a-zà-ÿ])/g,(m,a,b)=>a+b.toUpperCase());

/* ---------- 3. Ce que le dentiste peut prescrire ---------- */
S.DENT = [
  {groupe:'Antibiotiques', items:[
    {id:'amox', nom:'Amoxicilline'},
    {id:'augm', nom:'Amoxicilline + acide clavulanique'},
    {id:'metro', nom:'Métronidazole', note:'Pas d’alcool pendant le traitement (effet antabuse).'},
    {id:'clari', nom:'Clarithromycine'},
    {id:'azi', nom:'Azithromycine'},
    {id:'prist', nom:'Pristinamycine'},
    {id:'clinda', nom:'Clindamycine'},
    {id:'cefpo', nom:'Céfpodoxime'},
    {id:'cotri', nom:'Sulfaméthoxazole + triméthoprime'},
  ]},
  {groupe:'Antalgiques', items:[
    {id:'para', nom:'Paracétamol'},
    {id:'ibu', nom:'Ibuprofène (AINS)'},
    {id:'codeine', nom:'Codéine (palier 2)'},
    {id:'tramadol', nom:'Tramadol (palier 2)'},
  ]},
  {groupe:'Antifongiques, antiviraux, bain de bouche', items:[
    {id:'micon', nom:'Miconazole (Daktarin, Loramyc)', note:'L’interaction vaut aussi pour le gel buccal.'},
    {id:'ampho', nom:'Amphotéricine B (Fungizone)'},
    {id:'acic', nom:'Aciclovir, valaciclovir'},
    {id:'chx', nom:'Chlorhexidine (Paroex)'},
  ]},
  {groupe:'Anesthésie locale', items:[
    {id:'adre', nom:'Anesthésique avec adrénaline'},
    {id:'lido', nom:'Lidocaïne'},
  ]},
];
const LIMITE_ADRE = 'Limiter l’adrénaline : moins de 0,1 mg en 10 min et 0,3 mg en 1 h chez l’adulte (une cartouche de 1,7 mL à 1/200 000 en contient 0,0085 mg ; à 1/100 000, 0,017 mg).';

/* ---------- 4. Interactions : [médicaments dentaires, tag patient, niveau, texte, source] ---------- */
const I = [
  // Pénicillines A
  ['amox augm','mtx','ASDEC','Méthotrexate : toxicité hématologique augmentée (élimination freinée). Éviter : autre antibiotique ou avis du prescripteur.',TH],
  ['amox augm','allopurinol','APEC','Allopurinol : risque accru de réactions cutanées.',TH],
  ['amox augm','mycophenolate','APEC','Mycophénolate : concentrations d’acide mycophénolique diminuées d’environ un tiers.',TH],
  ['amox augm metro cefpo','avk','APEC','AVK : une infection et son antibiothérapie peuvent déséquilibrer l’INR. Contrôler l’INR dans les jours qui suivent (inutile pour une prise unique).',TH+', RCP Flagyl'],
  // Macrolides (sauf spiramycine)
  ['clari azi','colchicine','CI','Colchicine : toxicité potentiellement mortelle.',TH],
  ['clari azi','ergot','CI','Dérivés de l’ergot : ergotisme avec risque de nécrose des extrémités.',TH],
  ['clari azi','ergot_dopa','ASDEC','Agoniste dopaminergique dérivé de l’ergot : surdosage possible.',TH],
  ['clari azi','avk','PE','AVK : effet anticoagulant augmenté. Contrôle de l’INR plus fréquent.',TH],
  ['clari azi','digoxine','PE','Digoxine : digoxinémie augmentée. Surveillance clinique.',TH],
  ['clari azi','qt','PE','Médicament donnant des torsades de pointes : risque de trouble du rythme ventriculaire. Surveillance clinique et ECG ; plutôt un autre antibiotique.',TH],
  // Clarithromycine = inhibiteur puissant du CYP3A4
  ['clari','simva','CI','Simvastatine : risque de rhabdomyolyse.',TH],
  ['clari','ticagrelor','CI','Ticagrelor : concentrations très augmentées.',TH],
  ['clari','ivabradine','CI','Ivabradine : effets cardiaques indésirables majorés.',TH],
  ['clari','domperidone','CI','Dompéridone : risque de troubles du rythme.',TH],
  ['clari','dronedarone','CI','Dronédarone : concentrations très augmentées.',TH],
  ['clari','eplerenone','CI','Éplérénone : hyperkaliémie.',TH],
  ['clari','quetiapine','CI','Quétiapine : surdosage.',TH],
  ['clari','lurasidone','CI','Lurasidone : concentrations augmentées.',TH],
  ['clari','pimozide','CI','Pimozide : torsades de pointes.',TH],
  ['clari','ranolazine','CI','Ranolazine : concentrations augmentées.',TH],
  ['clari','aod','ASDEC','Anticoagulant oral direct : risque hémorragique majoré (apixaban, rivaroxaban : déconseillé). Préférer l’azithromycine.',TH+', SFCO 2015'],
  ['clari','lercanidipine','ASDEC','Lercanidipine : hypotension, œdèmes.',TH],
  ['clari','alphab','ASDEC','Alphabloquant (tamsulosine, alfuzosine, silodosine) : hypotension orthostatique.',TH],
  ['clari','cortico_inh_metab','ASDEC','Budésonide ou fluticasone inhalés : risque de syndrome de Cushing.',TH],
  ['clari','oxycodone','ASDEC','Oxycodone : dépression respiratoire.',TH],
  ['clari','is_cyp','ASDEC','Immunosuppresseur (ciclosporine, tacrolimus, évérolimus, sirolimus) : concentrations très augmentées, néphrotoxicité.',TH],
  ['clari','atorva prava','PE','Statine : risque de rhabdomyolyse.',TH],
  ['clari','ica verapamil','PE','Inhibiteur calcique : hypotension, bradycardie (vérapamil).',TH],
  ['clari','sulfamide repaglinide','PE','Sulfamide hypoglycémiant ou répaglinide : hypoglycémie. Prévenir le patient, renforcer l’autosurveillance.',TH],
  ['clari','carbamazepine','PE','Carbamazépine : signes de surdosage.',TH],
  ['clari','fentanyl','PE','Fentanyl : dépression respiratoire.',TH],
  ['clari','ritonavir','PE','Antirétroviral boosté : concentrations de clarithromycine augmentées.',TH],
  ['clari','pde5','PE','Inhibiteur de la PDE5 : hypotension.',TH],
  ['clari','theophylline venlafaxine alprazolam hypnotique','APEC','Concentrations du traitement augmentées (sédation, surdosage).',TH],
  // Azithromycine
  ['azi','simva atorva','PE','Statine : risque de rhabdomyolyse.',TH],
  ['azi','ciclosporine','PE','Ciclosporine : concentrations et créatininémie augmentées.',TH],
  ['azi','ivabradine','PE','Ivabradine : troubles du rythme. Surveillance clinique et ECG.',TH],
  // Pristinamycine
  ['prist','colchicine','CI','Colchicine : toxicité potentiellement mortelle.',TH],
  ['prist','avk','PE','AVK : effet anticoagulant augmenté. Contrôle de l’INR plus fréquent.',TH],
  ['prist','is_cyp','PE','Immunosuppresseur : concentrations augmentées. Dosage et fonction rénale.',TH],
  // Métronidazole
  ['metro','disulfirame','ASDEC','Disulfirame : psychose aiguë ou confusion.',TH+', RCP Flagyl'],
  ['metro','busulfan','ASDEC','Busulfan : concentrations doublées.',TH],
  ['metro','lithium','PE','Lithium : lithémie augmentée jusqu’à des valeurs toxiques. Surveillance stricte de la lithémie.',TH],
  ['metro','inducteur','PE','Inducteur enzymatique : métronidazole moins efficace.',TH],
  ['metro','fluoropyr','APEC','Fluorouracile ou capécitabine : toxicité augmentée.',TH],
  ['metro','alcool','ASDEC','Sevrage ou consommation d’alcool : effet antabuse. À éviter.',TH],
  // Clindamycine
  ['clinda','avk','PE','AVK : effet anticoagulant augmenté. Contrôle de l’INR plus fréquent.',TH],
  ['clinda','ciclosporine tacrolimus','PE','Ciclosporine ou tacrolimus : concentrations diminuées, risque de rejet.',TH],
  ['clinda','antiacide','PE','Antiacide ou pansement gastrique : absorption réduite. Prendre à plus de 2 h d’écart.',TH],
  // Cotrimoxazole
  ['cotri','avk','ASDEC','AVK : effet anticoagulant fortement augmenté.',TH],
  ['cotri','mtx','CI','Méthotrexate : toxicité hématologique (contre-indiqué au-delà de 20 mg/semaine, déconseillé en dessous).',TH],
  ['cotri','phenytoine','ASDEC','Phénytoïne : concentrations toxiques possibles.',TH],
  ['cotri','qt','ASDEC','Médicament donnant des torsades de pointes : trouble du rythme.',TH],
  ['cotri','repaglinide','ASDEC','Répaglinide : hypoglycémie.',TH],
  ['cotri','sulfamide','APEC','Sulfamide hypoglycémiant : hypoglycémie (rare).',TH],
  ['cotri','ciclosporine','APEC','Ciclosporine : créatininémie augmentée.',TH],
  // Paracétamol
  ['para','paracetamol','PE','Le patient prend déjà du paracétamol : ne pas cumuler, 4 g/j au maximum toutes spécialités confondues.','RCP paracétamol'],
  ['para','avk','PE','AVK : à 4 g/j pendant au moins 4 jours, INR augmenté. Contrôle de l’INR.',TH],
  // AINS
  ['ibu','anticoag','ASDEC','Anticoagulant oral : risque hémorragique majoré.',TH],
  ['ibu','heparine','ASDEC','Héparine : déconseillé à dose curative ou chez le sujet âgé ; à prendre en compte à dose préventive.',TH],
  ['ibu','aap','APEC','Antiagrégant : risque hémorragique majoré, notamment digestif.',TH],
  ['ibu','ains','ASDEC','Autre AINS déjà pris : risque ulcéreux et hémorragique. Ne pas cumuler.',TH],
  ['ibu','iec ara2 diuretique','PE','IEC, sartan ou diurétique : insuffisance rénale aiguë chez le patient à risque (âgé, déshydraté). Hydrater, surveiller la fonction rénale.',TH],
  ['ibu','ciclosporine tacrolimus tenofovir','PE','Néphrotoxicité additive. Surveiller la fonction rénale.',TH],
  ['ibu','lithium','ASDEC','Lithium : lithémie toxique possible.',TH],
  ['ibu','mtx','ASDEC','Méthotrexate : toxicité hématologique (déconseillé au-delà de 20 mg/semaine, NFS hebdomadaire en dessous).',TH],
  ['ibu','nicorandil','ASDEC','Nicorandil : risque ulcéreux et hémorragique digestif.',TH],
  ['ibu','cortico_os','APEC','Corticoïde : risque d’ulcère et d’hémorragie digestive.',TH],
  ['ibu','isrs irsna','APEC','Antidépresseur sérotoninergique : risque hémorragique majoré.',TH],
  ['ibu','betabloquant','APEC','Bêta-bloquant : effet antihypertenseur diminué.',TH],
  // Paliers 2
  ['codeine tramadol','cyp2d6','ASDEC','Fluoxétine, paroxétine, duloxétine, bupropion, terbinafine ou cinacalcet : antalgique inefficace (métabolisme bloqué).',TH],
  ['codeine tramadol','morph_aa','ASDEC','Buprénorphine ou nalbuphine : effet antalgique diminué, risque de sevrage.',TH],
  ['codeine tramadol','morphinique benzo','APEC','Autre opioïde ou sédatif : dépression respiratoire et sédation majorées.',TH],
  ['tramadol','imao','CI','IMAO non sélectif : syndrome sérotoninergique.',TH],
  ['tramadol','imao_a','ASDEC','IMAO-A : syndrome sérotoninergique.',TH],
  ['tramadol','imao_b isrs irsna','APEC','Sérotoninergique : convulsions ou syndrome sérotoninergique.',TH],
  ['tramadol','anticoag','APEC','Anticoagulant oral : risque hémorragique, surtout chez le sujet âgé.',TH],
  ['tramadol','ondansetron','APEC','Ondansétron : effet antalgique diminué.',TH],
  // Miconazole (toutes formes)
  ['micon','avk','CI','AVK : hémorragies imprévisibles, parfois graves. Prescrire de l’amphotéricine B (Fungizone).',TH],
  ['micon','sulfamide','CI','Sulfamide hypoglycémiant : hypoglycémie pouvant aller jusqu’au coma. Prescrire de l’amphotéricine B (Fungizone).',TH],
  ['micon','phenytoine','PE','Phénytoïne : concentrations toxiques possibles.',TH],
  // Anesthésie locale
  ['adre','tricyclique irsna imao imao_a','PE','Antidépresseur (tricyclique, IRSNA ou IMAO) : hypertension paroxystique, troubles du rythme. '+LIMITE_ADRE,TH+', RCP articaïne adrénalinée'],
  ['lido','amiodarone fluvoxamine','PE','Concentrations de lidocaïne augmentées (décrit surtout par voie IV). Rester aux doses minimales.',TH],
];
const RANG = {CI:4, ASDEC:3, PE:2, APEC:1};
S.NIVEAU = {CI:'Contre-indiqué', ASDEC:'Déconseillé', PE:'Précaution', APEC:'À prendre en compte'};

/* ---------- 5. Analyse ---------- */
S.analyser = function(meds){
  const tous = new Set(); meds.forEach(m=>m.tags.forEach(t=>tous.add(t)));
  const a = t => tous.has(t);
  const quiA = tag => meds.filter(m=>m.tags.has(tag));
  const noms = arr => arr.map(m=>m.dci).join(', ');

  // 5a. Prescriptions dentaires
  const presc = S.DENT.map(G=>({groupe:G.groupe, items:G.items.map(d=>{
    const par = new Map(); // médicament patient -> pire interaction
    for(const [dents, tags, niv, txt, src] of I){
      if(!dents.split(' ').includes(d.id)) continue;
      for(const tag of tags.split(' ')){
        for(const m of quiA(tag)){
          const prev = par.get(m.dci);
          if(!prev || RANG[niv] > RANG[prev.niv]) par.set(m.dci, {niv, txt, src, med:m.dci});
        }
      }
    }
    const raisons = [...par.values()].sort((x,y)=>RANG[y.niv]-RANG[x.niv]);
    // fusion des textes identiques
    const fus = [];
    for(const r of raisons){ const f = fus.find(x=>x.txt===r.txt && x.niv===r.niv); if(f) f.meds.push(r.med); else fus.push({...r, meds:[r.med]}); }
    const pire = fus[0]?.niv || 'OK';
    return {...d, niveau:pire, raisons:fus};
  })}));

  // 5b. Terrain et précautions avant un geste
  const T = []; const add = (n,t,d,src) => T.push({n,t,d,src});
  const nbAap = quiA('aap').length + (a('aap_double')?1:0);
  if(a('avk')) add('forte','Antivitamine K ('+noms(quiA('avk'))+')','Ne pas arrêter pour un acte à risque hémorragique faible. INR dans les 24 h (72 h au plus) avant l’acte, stable et inférieur à 4 ; sinon reporter. Acte à risque élevé : avis du prescripteur. Hémostase locale systématique. Pas d’aspirine ni d’AINS, pas de miconazole.','SFCO 2015');
  if(a('aod')) add('forte','Anticoagulant oral direct ('+noms(quiA('aod'))+')','Ne pas arrêter pour un acte à risque faible ; hémostase locale. Acte à risque élevé : avis du prescripteur (arrêt la veille et reprise le lendemain s’il le décide). Pas d’AINS, éviter la clarithromycine.','SFCO 2015');
  if(a('heparine')) add('moy','Héparine ('+noms(quiA('heparine'))+')','Poursuivre pour un acte à risque faible, hémostase locale. Acte à risque élevé : le prescripteur peut suspendre (6 à 8 h pour l’HNF, 24 h pour une HBPM).','SFCO 2015');
  if(nbAap>=2) add('forte','Bithérapie antiplaquettaire','Poursuite pour un acte à risque faible. Acte à risque élevé : avis du prescripteur obligatoire, ne rien arrêter de soi-même.','SFCO 2015');
  else if(nbAap===1) add('moy','Antiplaquettaire ('+noms(quiA('aap'))+')','Ne pas l’arrêter, quel que soit l’acte de chirurgie orale. Hémostase locale systématique.','SFCO 2015');
  if(a('anticoag')||a('aap')||a('heparine')) add('info','Organisation','Intervenir le matin et en début de semaine, par secteur. Patient joignable, hôpital à moins d’une heure.','SFCO 2015');
  if(a('valproate')) add('moy','Valproate','Thrombopénie et troubles de l’hémostase possibles : bilan d’hémostase et plaquettes avant une chirurgie.','RCP Dépakine');

  if(a('bp_malin')||a('denosumab_malin')||a('antiangio')) add('forte','Haut risque d’ostéonécrose des mâchoires ('+noms([...quiA('bp_malin'),...quiA('denosumab_malin'),...quiA('antiangio')])+')','Traitement anti-résorptif ou anti-angiogénique pour une pathologie maligne. Actes non invasifs en priorité, certains actes sont contre-indiqués : passer par Prescri’Dent.','HAS 2026');
  if(a('bp_os')) add('moy','Bisphosphonate pour ostéoporose ('+noms(quiA('bp_os'))+')','Demander la durée cumulée : 5 ans ou plus = haut risque d’ostéonécrose ; moins de 5 ans = comme la population générale.','HAS 2026');
  if(a('denosumab_os')) add('moy','Dénosumab (Prolia)','Demander la date de la dernière injection : moins de 6 mois = haut risque d’ostéonécrose.','HAS 2026');
  if(a('romosozumab')) add('moy','Romosozumab (Evenity)','Des ostéonécroses des mâchoires sont décrites : examen bucco-dentaire, gestes les moins invasifs.','RCP Evenity');
  if(a('hormono_k')) add('info','Hormonothérapie du cancer du sein','Souvent associée à un bisphosphonate ou au dénosumab : le demander.','');

  if(a('antirejet')) add('forte','Traitement anti-rejet ('+noms(quiA('antirejet'))+')','Risque infectieux augmenté si greffe d’organe ou de moelle. Antibioprophylaxie selon l’acte.','HAS 2026');
  else if(a('immunosup')) add('moy','Immunosuppresseur ou biothérapie ('+noms(quiA('immunosup'))+')','Risque infectieux à évaluer au cas par cas, au besoin avec le prescripteur.','HAS 2026');
  if(a('cortico_os')) add('moy','Corticoïde oral ('+noms(quiA('cortico_os'))+')','Risque infectieux augmenté si 10 mg/j ou plus d’équivalent prednisolone depuis plus de 2 semaines : demander la dose.','HAS 2026');
  if(a('chimio')) add('moy','Chimiothérapie ('+noms(quiA('chimio'))+')','Pathologie maligne en cours de traitement : demander si la chimiothérapie est aplasiante (risque infectieux) et la date de la dernière NFS.','HAS 2026');
  if(a('arv')) add('moy','Traitement antirétroviral','Risque infectieux augmenté si CD4 < 200/mm³ : demander le dernier bilan.','HAS 2026');
  if(a('antidiab')) add(a('insuline')||a('sulfamide')?'moy':'info','Diabète ('+noms(quiA('antidiab'))+')',
    'Demander l’HbA1c : 9 % ou plus = risque infectieux augmenté.'+(a('insuline')||a('sulfamide')||a('repaglinide')?' Risque d’hypoglycémie : rendez-vous après un repas, sucre à portée de main.':'')+(a('glp1')&&!a('metformine')&&quiA('antidiab').every(m=>m.tags.has('glp1'))?' Un analogue du GLP-1 seul peut aussi être prescrit pour l’obésité.':''),'HAS 2026');

  if(a('qt')) add('moy','Médicament allongeant le QT ('+noms(quiA('qt'))+')','Macrolides et cotrimoxazole à éviter si possible (troubles du rythme).',TH);
  if(a('angor')||a('nicorandil')) add('moy','Angor','Avoir la trinitrine du patient à portée de main. Adrénaline avec précaution (insuffisance coronarienne).','RCP articaïne adrénalinée');
  if(a('antiarythmique')||a('digoxine')) add('moy','Trouble du rythme','Adrénaline avec précaution : doses minimales, aspiration avant injection.','RCP articaïne adrénalinée');
  if(a('ic')) add('moy','Insuffisance cardiaque probable','Le confirmer à l’interrogatoire. Séances courtes, patient semi-assis si besoin. AINS à éviter.','');
  if(a('antihta')) add('info','Hypertension artérielle','Prendre la tension avant un geste. Se relever lentement du fauteuil (hypotension orthostatique). Adrénaline avec précaution si HTA sévère.','RCP articaïne adrénalinée');
  if(a('respi')||a('cortico_inh')) add('info','Asthme ou BPCO probable','Le confirmer. Ventoline du patient à portée de main. Asthme déclenché par l’aspirine ou les AINS : AINS contre-indiqués.','RCP');
  if(a('antiepi')&&!a('valproate')) add('info','Traitement antiépileptique','Épilepsie équilibrée ? Séances courtes, éviter le stress et la fatigue.','');
  if(a('ipp')) add('info','Inhibiteur de la pompe à protons','Demander s’il y a un antécédent d’ulcère ou d’hémorragie digestive (AINS déconseillés).','');
  if(a('lithium')) add('moy','Lithium','AINS déconseillés, métronidazole avec surveillance de la lithémie : préférer le paracétamol.',TH);
  if(a('mtx')) add('moy','Méthotrexate','Pénicillines, AINS et cotrimoxazole interagissent : avis du prescripteur avant de prescrire. Une stomatite peut être un signe de toxicité.',TH);
  if(a('substitution')) add('info','Traitement de substitution aux opiacés','Codéine et tramadol déconseillés avec la buprénorphine. Douleur : paracétamol et AINS en premier.',TH);
  if(a('alcool')) add('info','Sevrage alcoolique','Métronidazole à éviter (effet antabuse). Préférer un bain de bouche sans alcool.',TH);

  // 5c. Effets en bouche
  const B = []; const bouche = (tag,t,d) => { const q = quiA(tag); if(q.length) B.push({t:t+' ('+noms(q)+')', d}); };
  bouche('hyperplasie','Hyperplasie gingivale','Contrôle de plaque strict, détartrages rapprochés. Si importante : en parler au prescripteur.');
  bouche('xerostomie','Sécheresse buccale','Risque carieux et candidosique accru : fluor, hydratation, substituts salivaires.');
  bouche('cortico_inh','Candidose buccale','Rincer la bouche après chaque inhalation.');
  bouche('clozapine','Hypersialorrhée','Effet fréquent de la clozapine.');
  bouche('nicorandil','Ulcérations buccales','Décrites avec le nicorandil : ulcération qui ne guérit pas → en parler au prescripteur.');
  bouche('ulcerations','Stomatite, ulcérations','Peuvent signer une toxicité du méthotrexate : alerter le prescripteur.');
  bouche('anticoag','Saignement gingival','Saignement au brossage ou au sondage plus marqué.');
  bouche('metformine','Troubles du goût','Effet fréquent de la metformine.');

  // 5d. Pré-remplissage de Prescri'Dent
  const ttt = []; if(nbAap>=2) ttt.push('aap2'); else if(nbAap===1) ttt.push('aap');
  if(a('avk')) ttt.push('avk'); if(a('aod')) ttt.push('aod'); if(a('heparine')) ttt.push('heparine'); if(a('sulfamide')) ttt.push('sulfamide'); if(a('mtx')) ttt.push('mtx');
  const atcd = []; if(a('bp_malin')) atcd.push('bp_malin'); if(a('denosumab_malin')) atcd.push('denosumab'); if(a('antiangio')) atcd.push('antiangio');
  if(a('antirejet')) atcd.push('greffe'); else if(a('immunosup')) atcd.push('immunosup');
  if(a('qt')) atcd.push('qt');
  const aDemander = [];
  if(a('bp_os')) aDemander.push('durée du bisphosphonate'); if(a('denosumab_os')) aDemander.push('date de la dernière injection de Prolia');
  if(a('antidiab')) aDemander.push('HbA1c'); if(a('cortico_os')) aDemander.push('dose de corticoïde'); if(a('arv')) aDemander.push('CD4');
  if(a('chimio')) aDemander.push('chimiothérapie aplasiante ?'); if(a('respi')||a('cortico_inh')) aDemander.push('asthme ?');

  return {presc, terrain:T, bouche:B, prefill:{ttt, atcd}, aDemander};
};

/* ---------- 6. Résumé texte (pour l'assistant IA) ---------- */
S.resumer = function(meds, R, inconnus, specs){
  const strip = s => String(s).replace(/<[^>]+>/g,'');
  const l = [];
  if(specs && specs.length) l.push('Spécialités identifiées dans la base officielle (BDPM) : '+specs.map(x=>`${x.nom} (${x.subs.join(' + ')}${x.classe?' ; '+x.classe:''})`).join(' ; ')+'.');
  l.push('Médicaments couverts par les règles d’interaction de Drill : '+(meds.map(m=>`${m.dci} (${m.classe})`).join(' ; ')||'aucun')+'.');
  if(inconnus.length) l.push('Lignes non reconnues par la base de Drill : '+inconnus.join(' ; ')+'.');
  R.terrain.forEach(t=>l.push(`Terrain — ${t.t} : ${strip(t.d)}`));
  R.presc.forEach(G=>G.items.filter(i=>i.niveau!=='OK').forEach(i=>l.push(`Si prescription de ${i.nom} : ${S.NIVEAU[i.niveau]} — ${i.raisons.map(r=>r.txt+' ['+r.meds.join(', ')+']').join(' ')}`)));
  R.bouche.forEach(b=>l.push(`Effet en bouche — ${b.t} : ${b.d}`));
  if(R.aDemander.length) l.push('À demander au patient : '+R.aDemander.join(', ')+'.');
  return l.join('\n');
};

S.LISTE = LISTE;
window.MEDS = S;
})();
