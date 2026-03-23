export interface FeatureItem {
  id: string;
  icon: string;
  title: Record<string, string>;
  description: Record<string, string>;
}

export interface FeatureCategory {
  id: string;
  icon: string;
  title: Record<string, string>;
  features: FeatureItem[];
}

export const FEATURES_DATA: FeatureCategory[] = [
  {
    id: "privacy",
    icon: "ShieldCheck",
    title: {
      en: "Ownership & Privacy",
      tr: "Özgürlük ve Gizlilik",
      de: "Eigentum & Datenschutz",
      es: "Propiedad y Privacidad",
      fr: "Propriété et Confidentialité",
      it: "Proprietà e Privacy",
      pt: "Propriedade e Privacidade",
      nl: "Eigendom & Privacy"
    },
    features: [
      {
        id: "lifetime",
        icon: "Ticket",
        title: {
          en: "Lifetime Access",
          tr: "Ömür Boyu Erişim",
          de: "Lebenslanger Zugriff",
          es: "Acceso de por vida",
          fr: "Accès à vie",
          it: "Accesso a vita",
          pt: "Acesso vitalício",
          nl: "Levenslange toegang"
        },
        description: {
          en: "One-time payment ($149), no subscriptions, forever yours.",
          tr: "Tek seferlik ödeme ($149), abonelik yok, sonsuza kadar sizin.",
          de: "Einmalige Zahlung (149 $), keine Abonnements, für immer Ihr Eigentum.",
          es: "Pago único ($149), sin suscripciones, para siempre tuyo.",
          fr: "Paiement unique (149 $), pas d'abonnement, à vous pour toujours.",
          it: "Pagamento una tantum ($149), nessun abbonamento, per sempre tuo.",
          pt: "Pagamento único ($149), sem assinaturas, para sempre seu.",
          nl: "Eenmalige betaling ($149), geen abonnementen, voor altijd van jou."
        }
      },
      {
        id: "offline",
        icon: "WifiOff",
        title: {
          en: "100% Offline Power",
          tr: "%100 Çevrimdışı Güç",
          de: "100 % Offline-Leistung",
          es: "Potencia 100% fuera de línea",
          fr: "Puissance 100 % hors ligne",
          it: "Potenza 100% offline",
          pt: "Poder 100% offline",
          nl: "100% offline vermogen"
        },
        description: {
          en: "Work anywhere—airplanes, remote fields, or bunkers. Data never leaves your device.",
          tr: "Her yerde çalışın; uçakta, sığınakta veya sahada. Veriler cihazınızdan asla ayrılmaz.",
          de: "Arbeiten Sie überall – im Flugzeug, auf entlegenen Feldern oder in Bunkern. Daten verlassen niemals Ihr Gerät.",
          es: "Trabaja en cualquier lugar: aviones, campos remotos o búnkeres. Los datos nunca salen de tu dispositivo.",
          fr: "Travaillez n'importe où : avions, terrains reculés ou bunkers. Les données ne quittent jamais votre appareil.",
          it: "Lavora ovunque: aerei, campi remoti o bunker. I dati non lasciano mai il tuo dispositivo.",
          pt: "Trabalhe em qualquer lugar: aviões, campos remotos ou bunkers. Os dados nunca saem do seu dispositivo.",
          nl: "Werk overal: vliegtuigen, afgelegen velden of bunkers. Gegevens verlaten nooit je apparaat."
        }
      },
      {
        id: "hardware",
        icon: "Cpu",
        title: {
          en: "Hardware-Locked Security",
          tr: "Donanım Kilitli Güvenlik",
          de: "Hardware-gebundene Sicherheit",
          es: "Seguridad bloqueada por hardware",
          fr: "Sécurité verrouillée par matériel",
          it: "Sicurezza bloccata dall'hardware",
          pt: "Segurança bloqueada por hardware",
          nl: "Hardware-vergrendelde beveiliging"
        },
        description: {
          en: "Military-grade local encryption. Your research stays strictly confidential.",
          tr: "Askeri düzeyde yerel şifreleme. Araştırmanız tamamen gizli kalır.",
          de: "Lokale Verschlüsselung auf Militärniveau. Ihre Forschung bleibt streng vertraulich.",
          es: "Cifrado local de grado militar. Tu investigación sigue siendo estrictamente confidencial.",
          fr: "Cryptage local de qualité militaire. Vos recherches restent strictement confidentielles.",
          it: "Crittografia locale di livello militare. La tua ricerca rimane rigorosamente riservata.",
          pt: "Criptografia local de nível militar. Sua pesquisa permanece estritamente confidencial.",
          nl: "Lokale encryptie van militaire kwaliteit. Uw onderzoek blijft strikt vertrouwelijk."
        }
      },
      {
        id: "cloud-sync",
        icon: "Cloud",
        title: {
          en: "Optional Cloud Backup",
          tr: "Opsiyonel Bulut Yedeği",
          de: "Optionales Cloud-Backup",
          es: "Copia de seguridad en la nube opcional",
          fr: "Sauvegarde cloud facultative",
          it: "Backup cloud opzionale",
          pt: "Backup na nuvem opcional",
          nl: "Optionele cloud-back-up"
        },
        description: {
          en: "Securely sync to your own Google Drive. You control the keys.",
          tr: "Güvenli bir şekilde kendi Google Drive'ınıza senkronize edin. Anahtarlar sizde.",
          de: "Sicher mit Ihrem eigenen Google Drive synchronisieren. Sie kontrollieren die Schlüssel.",
          es: "Sincroniza de forma segura con tu propio Google Drive. Tú controlas las llaves.",
          fr: "Synchronisez en toute sécurité avec votre propre Google Drive. Vous contrôlez les clés.",
          it: "Sincronizza in modo sicuro con il tuo Google Drive. Tu controlli le chiavi.",
          pt: "Sincronize com segurança com seu próprio Google Drive. Você controla as chaves.",
          nl: "Veilig synchroniseren met je eigen Google Drive. Jij beheert de sleutels."
        }
      }
    ]
  },
  {
    id: "qda",
    icon: "Zap",
    title: {
      en: "Core QDA Power",
      tr: "Temel Nitel Analiz Gücü",
      de: "Kern-QDA-Leistung",
      es: "Poder central de QDA",
      fr: "Puissance QDA de base",
      it: "Potenza QDA principale",
      pt: "Poder central de QDA",
      nl: "Kern QDA-kracht"
    },
    features: [
      {
        id: "media-coding",
        icon: "Files",
        title: {
          en: "Multi-Media Coding",
          tr: "Çoklu Medya Kodlama",
          de: "Multimedia-Kodierung",
          es: "Codificación multimedia",
          fr: "Codage multimédia",
          it: "Codifica multimediale",
          pt: "Codificação multimédia",
          nl: "Multimedia-codering"
        },
        description: {
          en: "Unified coding for Text, PDF, Images, and Video with pixel-perfect precision.",
          tr: "Metin, PDF, Görsel ve Videolar için tek bir arayüzde yüksek hassasiyetli kodlama.",
          de: "Einheitliche Kodierung für Text, PDF, Bilder und Video mit pixelgenauer Präzision.",
          es: "Codificación unificada para texto, PDF, imágenes y video con una precisión perfecta de píxeles.",
          fr: "Codage unifié pour le texte, le PDF, les images et la vidéo avec une précision parfaite au pixel près.",
          it: "Codifica unificata per testo, PDF, immagini e video con precisione millimetrica.",
          pt: "Codificação unificada para texto, PDF, imagens e vídeo com precisão de pixel perfeita.",
          nl: "Uniforme codering voor tekst, PDF, afbeeldingen en video met pixel-perfecte precisie."
        }
      },
      {
        id: "hierarchy",
        icon: "GitMerge",
        title: {
          en: "Dynamic Code Tree",
          tr: "Dinamik Kod Ağacı",
          de: "Dynamischer Codebaum",
          es: "Árbol de códigos dinámico",
          fr: "Arborescence de codes dynamique",
          it: "Albero dei codici dinamico",
          pt: "Árvore de código dinâmica",
          nl: "Dynamische codestructuur"
        },
        description: {
          en: "Infinite nesting, vibrant color tagging, and drag-and-drop hierarchy management.",
          tr: "Sınırsız derinlik, canlı renk etiketleri ve sürükle-bırak hiyerarşi yönetimi.",
          de: "Unendliche Verschachtelung, lebendige Farbmarkierung und Drag-and-Drop-Hierarchieverwaltung.",
          es: "Anidamiento infinito, etiquetado de colores vibrantes y gestión de jerarquías mediante arrastrar y soltar.",
          fr: "Imbrication infinie, marquage par couleurs vives et gestion de la hiérarchie par glisser-déposer.",
          it: "Nidificazione infinita, etichettatura con colori vivaci e gestione della gerarchia drag-and-drop.",
          pt: "Aninhamento infinito, marcação de cores vibrantes e gerenciamento de hierarquia por arrastar e soltar.",
          nl: "Oneindige nesteling, levendige kleurmarkering en hiërarchiebeheer met slepen en neerzetten."
        }
      },
      {
        id: "shortcuts",
        icon: "Keyboard",
        title: {
          en: "Keyboard First",
          tr: "Önce Klavye",
          de: "Tastatur-fokussiert",
          es: "Primero el teclado",
          fr: "Le clavier d'abord",
          it: "Prima la tastiera",
          pt: "Teclado primeiro",
          nl: "Toetsenbord eerst"
        },
        description: {
          en: "Blazing fast workflow with 'C' shortcuts and CMD+K command palette.",
          tr: "'C' kısayolu ve CMD+K komut paleti ile ışık hızında iş akışı.",
          de: "Blitzschneller Workflow mit 'C'-Kurzbefehlen und der CMD+K-Befehlspalette.",
          es: "Flujo de trabajo ultrarrápido con atajos 'C' y paleta de comandos CMD+K.",
          fr: "Flux de travail ultra-rapide avec les raccourcis 'C' et la palette de commandes CMD+K.",
          it: "Flusso di lavoro velocissimo con le scorciatoie 'C' e la tavolozza dei comandi CMD+K.",
          pt: "Fluxo de trabalho extremamente rápido com atalhos 'C' e paleta de comandos CMD+K.",
          nl: "Supersnelle workflow met 'C'-sneltoetsen en CMD+K-opdrachtenpalet."
        }
      },
      {
        id: "context",
        icon: "Users",
        title: {
          en: "Deep Contextualization",
          tr: "Derin Bağlamsallaştırma",
          de: "Tiefe Kontextualisierung",
          es: "Contextualización profunda",
          fr: "Contextualisation approfondie",
          it: "Contestualizzazione profonda",
          pt: "Contextualização profunda",
          nl: "Diepe contextualisering"
        },
        description: {
          en: "Manage participant demographics and study variables to filter complex datasets.",
          tr: "Karmaşık veri setlerini filtrelemek için katılımcı demografisini ve değişkenleri yönetin.",
          de: "Verwalten Sie Teilnehmerdemografie und Studienvariablen, um komplexe Datensätze zu filtern.",
          es: "Administre los datos demográficos de los participantes y las variables del estudio para filtrar conjuntos de datos complejos.",
          fr: "Gérez les données démographiques des participants et les variables d'étude pour filtrer des ensembles de données complexes.",
          it: "Gestisci i dati demografici dei partecipanti e le variabili di studio per filtrare set di dati complessi.",
          pt: "Gerencie a demografia dos participantes e as variáveis de estudo para filtrar conjuntos de dados complexos.",
          nl: "Beheer de demografische gegevens van deelnemers en studievariabelen om complexe datasets te filteren."
        }
      }
    ]
  },
  {
    id: "ai",
    icon: "Brain",
    title: {
      en: "BYOK AI Intelligence",
      tr: "Yapay Zeka Zekası",
      de: "BYOK KI-Intelligenz",
      es: "Inteligencia artificial BYOK",
      fr: "Intelligence artificielle BYOK",
      it: "Intelligenza Artificiale BYOK",
      pt: "Inteligência Artificial BYOK",
      nl: "BYOK AI-intelligentie"
    },
    features: [
      {
        id: "byok",
        icon: "Key",
        title: {
          en: "Bring Your Own Key",
          tr: "Kendi Anahtarını Getir",
          de: "Bringen Sie Ihren eigenen Schlüssel mit",
          es: "Trae tu propia llave",
          fr: "Apportez votre propre clé",
          it: "Porta la tua chiave",
          pt: "Traga sua própria chave",
          nl: "Breng je eigen sleutel mee"
        },
        description: {
          en: "Support for OpenAI, Anthropic, and Gemini. Pay only for what you actually use.",
          tr: "OpenAI, Anthropic ve Gemini desteği. Sadece gerçekten kullandığınız kadar ödeyin.",
          de: "Unterstützung für OpenAI, Anthropic und Gemini. Zahlen Sie nur für das, was Sie tatsächlich nutzen.",
          es: "Soporte para OpenAI, Anthropic y Gemini. Paga solo por lo que realmente usas.",
          fr: "Prise en charge d'OpenAI, Anthropic et Gemini. Ne payez que ce que vous utilisez réellement.",
          it: "Supporto per OpenAI, Anthropic e Gemini. Paga solo per quello che usi effettivamente.",
          pt: "Suporte para OpenAI, Anthropic e Gemini. Pague apenas pelo que você realmente usa.",
          nl: "Ondersteuning voor OpenAI, Anthropic en Gemini. Betaal alleen voor wat je echt gebruikt."
        }
      },
      {
        id: "auto-coding",
        icon: "Sparkles",
        title: {
          en: "AI-Assisted Coding",
          tr: "AI Destekli Kodlama",
          de: "KI-gestützte Kodierung",
          es: "Codificación asistida por IA",
          fr: "Codage assisté par IA",
          it: "Codifica assistita dall'intelligenza artificiale",
          pt: "Codificação assistida por IA",
          nl: "AI-ondersteunde codering"
        },
        description: {
          en: "Automatically extract themes and suggested codes from your research questions.",
          tr: "Araştırma sorularınızdan otomatik olarak temalar ve kod önerileri çıkarın.",
          de: "Extrahieren Sie automatisch Themen und vorgeschlagene Codes aus Ihren Forschungsfragen.",
          es: "Extraiga automáticamente temas y códigos sugeridos a partir de sus preguntas de investigación.",
          fr: "Extrayez automatiquement des thèmes et des suggestions de codes à partir de vos questions de recherche.",
          it: "Estrai automaticamente temi e codici suggeriti dalle tue domande di ricerca.",
          pt: "Extraia automaticamente temas e códigos sugeridos de suas perguntas de pesquisa.",
          nl: "Extraheer automatisch thema's en voorgestelde codes uit uw onderzoeksvragen."
        }
      },
      {
        id: "synthesis",
        icon: "Merge",
        title: {
          en: "Synthesis Engine",
          tr: "Sentez Motoru",
          de: "Synthese-Engine",
          es: "Motor de síntesis",
          fr: "Moteur de synthèse",
          it: "Motore di sintesi",
          pt: "Motor de síntese",
          nl: "Synthese-engine"
        },
        description: {
          en: "Generate QMARS-compliant meta-syntheses and cross-tab summaries in seconds.",
          tr: "Saniyeler içinde QMARS uyumlu meta-sentezler ve çapraz tablo özetleri oluşturun.",
          de: "Erstellen Sie in Sekundenschnelle QMARS-konforme Metasynthesen und Kreuztabellen-Zusammenfassungen.",
          es: "Genere metasíntesis y resúmenes de tablas cruzadas compatibles con QMARS en segundos.",
          fr: "Générez des méta-synthèses conformes à QMARS et des résumés de tableaux croisés en quelques secondes.",
          it: "Genera meta-sintesi conformi a QMARS e riepiloghi di tabelle incrociate in pochi secondi.",
          pt: "Gere meta-sínteses em conformidade com o QMARS e resumos de tabelas cruzadas em segundos.",
          nl: "Genereer binnen enkele seconden voor QMARS geschikte metasyntheses en samenvattingen van kruistabellen."
        }
      },
      {
        id: "chat-doc",
        icon: "MessageSquare",
        title: {
          en: "Interrogative Analysis",
          tr: "Sorgulayıcı Analiz",
          de: "Interrogative Analyse",
          es: "Análisis interrogativo",
          fr: "Analyse interrogative",
          it: "Analisi interrogativa",
          pt: "Análise interrogativa",
          nl: "Interrogatieve analyse"
        },
        description: {
          en: "Chat directly with your PDF documents and interviews to find hidden patterns.",
          tr: "Gizli desenleri bulmak için PDF belgeleriniz ve mülakatlarınızla doğrudan sohbet edin.",
          de: "Chatten Sie direkt mit Ihren PDF-Dokumenten und Interviews, um versteckte Muster zu finden.",
          es: "Chatea directamente con tus documentos PDF y entrevistas para encontrar patrones ocultos.",
          fr: "Discutez directement avec vos documents PDF et vos entretiens pour trouver des modèles cachés.",
          it: "Chatta direttamente con i tuoi documenti PDF e le tue interviste per trovare schemi nascosti.",
          pt: "Converse diretamente com seus documentos PDF e entrevistas para encontrar padrões ocultos.",
          nl: "Chat rechtstreeks met uw PDF-documenten en interviews om verborgen patronen te vinden."
        }
      }
    ]
  },
  {
    id: "integrity",
    icon: "GraduationCap",
    title: {
      en: "Academic Rigor",
      tr: "Akademik Titizlik",
      de: "Akademische Strenge",
      es: "Rigor académico",
      fr: "Rigueur académique",
      it: "Rigore accademico",
      pt: "Rigor acadêmico",
      nl: "Academische discipline"
    },
    features: [
      {
        id: "reflexivity",
        icon: "PenTool",
        title: {
          en: "Reflexivity Journal",
          tr: "Düşünümsellik Günlüğü",
          de: "Reflexivitätstagebuch",
          es: "Diario de reflexividad",
          fr: "Journal de réflexivité",
          it: "Diario di riflessività",
          pt: "Diário de reflexividade",
          nl: "Reflexiviteitsdagboek"
        },
        description: {
          en: "Transparently document your researcher bias and personal journey through the data.",
          tr: "Araştırmacı önyargılarını ve veriler içindeki kişisel yolculuğunu şeffafça belgeleyin.",
          de: "Dokumentieren Sie transparent Ihre Forscher-Voreingenommenheit und Ihren persönlichen Weg durch die Daten.",
          es: "Documenta de forma transparente tus prejuicios como investigador y tu trayectoria personal a través de los datos.",
          fr: "Documentez de manière transparente vos préjugés de chercheur et votre parcours personnel à travers les données.",
          it: "Documenta in modo trasparente i tuoi pregiudizi di ricercatore e il tuo percorso personale attraverso i dati.",
          pt: "Documente de forma transparente seus preconceitos de pesquisador e sua jornada pessoal através dos dados.",
          nl: "Documenteer op transparante wijze je vooroordelen als onderzoeker en je persoonlijke reis door de gegevens."
        }
      },
      {
        id: "audit-trail",
        icon: "History",
        title: {
          en: "Immutable Audit Trail",
          tr: "Değişmez Denetim İzi",
          de: "Unveränderlicher Audit-Trail",
          es: "Pista de auditoría inmutable",
          fr: "Piste d'audit immuable",
          it: "Percorso di controllo immutabile",
          pt: "Trilha de auditoria imutável",
          nl: "Onveranderlijk auditspoor"
        },
        description: {
          en: "Track the complete evolution of your code system and methodological decisions.",
          tr: "Kod sisteminizin ve metodolojik kararlarınızın tam evrimini takip edin.",
          de: "Verfolgen Sie die vollständige Entwicklung Ihres Codesystems und Ihrer methodischen Entscheidungen.",
          es: "Realice un seguimiento de la evolución completa de su sistema de códigos y decisiones metodológicas.",
          fr: "Suivez l'évolution complète de votre système de codes et de vos décisions méthodologiques.",
          it: "Traccia l'evoluzione completa del tuo sistema di codici e delle tue decisioni metodologiche.",
          pt: "Acompanhe a evolução completa do seu sistema de código e decisões metodológicas.",
          nl: "Volg de volledige evolutie van uw codestructuur en methodologische beslissingen."
        }
      },
      {
        id: "disconfirming",
        icon: "Zap",
        title: {
          en: "Disconfirming Evidence",
          tr: "Zıt Kanıt (İstisna Avcısı)",
          de: "Widerlegende Beweise",
          es: "Evidencia de refutación",
          fr: "Preuves de réfutation",
          it: "Prove di disconferma",
          pt: "Evidência desconfirmadora",
          nl: "Tegenbewijs"
        },
        description: {
          en: "Explicitly identify and justify outliers to reach higher methodological integrity.",
          tr: "Yüksek metodolojik bütünlüğe ulaşmak için aykırı durumları açıkça belirleyin.",
          de: "Identifizieren und rechtfertigen Sie Ausreißer explizit, um eine höhere methodische Integrität zu erreichen.",
          es: "Identifique y justifique explícitamente los valores atípicos para alcanzar una mayor integridad metodológica.",
          fr: "Identifiez et justifiez explicitement les valeurs aberrantes pour atteindre une plus grande intégrité méthodologique.",
          it: "Identifica e giustifica esplicitamente i valori anomali per raggiungere una maggiore integrità metodologica.",
          pt: "Identifique e justifique explicitamente os valores atípicos para alcançar maior integridade metodológica.",
          nl: "Identificeer en rechtvaardig expliciet uitschieters om een hogere methodologische integriteit te bereiken."
        }
      },
      {
        id: "saturation",
        icon: "Activity",
        title: {
          en: "Saturation Radar",
          tr: "Doygunluk Radarı",
          de: "Sättigungsradar",
          es: "Radar de saturación",
          fr: "Radar de saturation",
          it: "Radar di saturazione",
          pt: "Radar de saturação",
          nl: "Verzadigingsradar"
        },
        description: {
          en: "Visual proof of theoretical saturation—know exactly when your coding is complete.",
          tr: "Teorik doygunluğun görsel kanıtı; kodlamanın ne zaman tamamlandığını tam olarak bilin.",
          de: "Visueller Beweis für die theoretische Sättigung – wissen Sie genau, wann Ihre Kodierung abgeschlossen ist.",
          es: "Evidencia visual de saturación teórica: sepa exactamente cuándo se completa su codificación.",
          fr: "Preuve visuelle de la saturation théorique — sachez exactement quand votre codage est terminé.",
          it: "Prova visiva della saturazione teorica: sappi esattamente quando la tua codifica è completa.",
          pt: "Prova visual de saturação teórica – saiba exatamente quando sua codificação está completa.",
          nl: "Visueel bewijs van theoretische verzadiging – weet precies wanneer uw codering voltooid is."
        }
      }
    ]
  },
  {
    id: "visuals",
    icon: "LayoutDashboard",
    title: {
      en: "Advanced Analytics",
      tr: "Gelişmiş Analitik",
      de: "Erweiterte Analysen",
      es: "Analítica avanzada",
      fr: "Analytique avancée",
      it: "Analitica avanzata",
      pt: "Análise avançada",
      nl: "Geavanceerde analyse"
    },
    features: [
      {
        id: "networks",
        icon: "Share2",
        title: {
          en: "Interactive Networks",
          tr: "Etkileşimli Ağlar",
          de: "Interaktive Netzwerke",
          es: "Redes interactivas",
          fr: "Réseaux interactifs",
          it: "Reti interattive",
          pt: "Redes interativas",
          nl: "Interactieve netwerken"
        },
        description: {
          en: "Explore relational overlaps with solar-system and gravitational code maps.",
          tr: "Güneş sistemi ve yerçekimsel kod haritaları ile ilişkisel kesişimleri keşfedin.",
          de: "Erkunden Sie Beziehungsüberlappungen mit Sonnensystem- und Gravitations-Codekarten.",
          es: "Explore las superposiciones relacionales con mapas de códigos de sistemas solares y gravitacionales.",
          fr: "Explorez les chevauchements relationnels avec les cartes de codes du système solaire et gravitationnelles.",
          it: "Esplora le sovrapposizioni relazionali con il sistema solare e le mappe dei codici gravitazionali.",
          pt: "Explore sobreposições relacionais com o sistema solar e mapas de códigos gravitacionais.",
          nl: "Verken relationele overlappen met zonnestelsel- en gravitationele codewarren."
        }
      },
      {
        id: "narrative",
        icon: "MoveRight",
        title: {
          en: "Narrative Flow",
          tr: "Anlatı Akışı",
          de: "Narrativer Fluss",
          es: "Flujo narrativo",
          fr: "Flux narratif",
          it: "Flusso narrativo",
          pt: "Fluxo narrativo",
          nl: "Narratieve stroom"
        },
        description: {
          en: "Visualize the chronological distribution of themes across your narrative data.",
          tr: "Temaların anlatı verileriniz üzerindeki kronolojik dağılımını görselleştirin.",
          de: "Visualisieren Sie die chronologische Verteilung von Themen in Ihren narrativen Daten.",
          es: "Visualice la distribución cronológica de temas a través de sus datos narrativos.",
          fr: "Visualisez la distribution chronologique des thèmes à travers vos données narratives.",
          it: "Visualizza la distribuzione cronologica dei temi nei tuoi dati narrativi.",
          pt: "Visualize a distribuição cronológica dos temas em seus dados narrativos.",
          nl: "Visualiseer de chronologische spreiding van thema's over uw narratieve gegevens."
        }
      },
      {
        id: "typology",
        icon: "Columns",
        title: {
          en: "Typology Mapping",
          tr: "Tipoloji Haritalama",
          de: "Typologie-Mapping",
          es: "Mapeo de tipología",
          fr: "Cartographie de typologie",
          it: "Mappatura della tipologia",
          pt: "Mapeamento de tipologia",
          nl: "Typologiekaarten"
        },
        description: {
          en: "Automatically cluster cases based on thematic intensity and similarities.",
          tr: "Vakaları tematik yoğunluk ve benzerliklere göre otomatik olarak kümelendirin.",
          de: "Cluster-Fälle automatisch basierend auf thematischer Intensität und Ähnlichkeiten.",
          es: "Agrupe automáticamente los casos en función de la intensidad temática y las similitudes.",
          fr: "Regroupez automatiquement les cas en fonction de l'intensité thématique et des similitudes.",
          it: "Raggruppa automaticamente i casi in base all'intensità tematica e alle somiglianze.",
          pt: "Agrupar casos automaticamente com base na intensidade temática e semelhanças.",
          nl: "Cluster cases automatisch op basis van thematische intensiteit en overeenkomsten."
        }
      },
      {
        id: "export",
        icon: "FileOutput",
        title: {
          en: "Scholarly Export",
          tr: "Bilimsel Çıktı",
          de: "Wissenschaftlicher Export",
          es: "Exportación académica",
          fr: "Exportation savante",
          it: "Esportazione accademica",
          pt: "Exportação acadêmica",
          nl: "Wetenschappelijke export"
        },
        description: {
          en: "Generate Word reports with APA citations and automatic reference lists.",
          tr: "APA atıfları ve otomatik kaynakça listeleri içeren Word raporları oluşturun.",
          de: "Erstellen Sie Word-Berichte mit APA-Zitaten und automatischen Referenzlisten.",
          es: "Genere informes de Word con citas APA y listas de referencias automáticas.",
          fr: "Générez des rapports Word avec des citations APA et des listes de références automatiques.",
          it: "Genera report Word con citazioni APA e elenchi di riferimenti automatici.",
          pt: "Gere relatórios Word com citações APA e listas de referências automáticas.",
          nl: "Genereer Word-rapporten met APA-citaten en automatische referentielijsten."
        }
      }
    ]
  }
];
