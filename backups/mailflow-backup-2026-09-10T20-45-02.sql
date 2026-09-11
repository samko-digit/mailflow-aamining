--
-- PostgreSQL database dump
--

\restrict Ce8OWJaG0o60C17lAkCe7KHaRVprRHIaJdADG3tcW6F2ysPaFeapmSmyVtGM3ke

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: Acteur; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."Acteur" AS ENUM (
    'SYSTEME',
    'UTILISATEUR'
);


ALTER TYPE public."Acteur" OWNER TO mailflow;

--
-- Name: CanalReponse; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."CanalReponse" AS ENUM (
    'MAIL',
    'TELEPHONE',
    'REUNION',
    'WHATSAPP',
    'PHYSIQUE'
);


ALTER TYPE public."CanalReponse" OWNER TO mailflow;

--
-- Name: DestinataireRelance; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."DestinataireRelance" AS ENUM (
    'PROPRIETAIRE',
    'SUPPLEANT',
    'ESCALADE'
);


ALTER TYPE public."DestinataireRelance" OWNER TO mailflow;

--
-- Name: Fournisseur; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."Fournisseur" AS ENUM (
    'MICROSOFT',
    'GOOGLE',
    'IMAP'
);


ALTER TYPE public."Fournisseur" OWNER TO mailflow;

--
-- Name: Priorite; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."Priorite" AS ENUM (
    'BASSE',
    'NORMALE',
    'HAUTE',
    'CRITIQUE'
);


ALTER TYPE public."Priorite" OWNER TO mailflow;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."Role" AS ENUM (
    'ADMINISTRATEUR',
    'GESTIONNAIRE',
    'RESPONSABLE',
    'LECTEUR'
);


ALTER TYPE public."Role" OWNER TO mailflow;

--
-- Name: SensMessage; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."SensMessage" AS ENUM (
    'ENTRANT',
    'SORTANT'
);


ALTER TYPE public."SensMessage" OWNER TO mailflow;

--
-- Name: StatutEchange; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."StatutEchange" AS ENUM (
    'A_QUALIFIER',
    'EN_ATTENTE',
    'RELANCE',
    'ESCALADE',
    'REPONDU',
    'SANS_SUITE',
    'HORS_PERIMETRE',
    'ARCHIVE'
);


ALTER TYPE public."StatutEchange" OWNER TO mailflow;

--
-- Name: StatutRelance; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."StatutRelance" AS ENUM (
    'ENVOYEE',
    'ECHEC'
);


ALTER TYPE public."StatutRelance" OWNER TO mailflow;

--
-- Name: StatutTravail; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."StatutTravail" AS ENUM (
    'EN_ATTENTE',
    'EN_COURS',
    'TERMINE',
    'ECHEC',
    'ANNULE'
);


ALTER TYPE public."StatutTravail" OWNER TO mailflow;

--
-- Name: TypeCorrespondant; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."TypeCorrespondant" AS ENUM (
    'CLIENT',
    'FOURNISSEUR',
    'AUTORITE',
    'PARTENAIRE',
    'INTERNE',
    'AUTRE'
);


ALTER TYPE public."TypeCorrespondant" OWNER TO mailflow;

--
-- Name: TypeEvenement; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."TypeEvenement" AS ENUM (
    'MAIL_DETECTE',
    'MAIL_ENREGISTRE',
    'MAIL_QUALIFIE',
    'MAIL_ATTRIBUE',
    'MAIL_TRANSMIS',
    'RELANCE_ENVOYEE',
    'RELANCE_REPORTEE',
    'RELANCE_ECHEC',
    'REPONSE_DETECTEE',
    'REPONSE_DECLAREE',
    'ESCALADE_DECLENCHEE',
    'ECHANGE_CLOS',
    'MAIL_ARCHIVE',
    'PARAMETRE_MODIFIE',
    'REGLE_MODIFIEE',
    'UTILISATEUR_MODIFIE',
    'ANOMALIE_TECHNIQUE',
    'MAIL_REQUALIFIE'
);


ALTER TYPE public."TypeEvenement" OWNER TO mailflow;

--
-- Name: TypeExclusion; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."TypeExclusion" AS ENUM (
    'ADRESSE',
    'DOMAINE',
    'MOTIF'
);


ALTER TYPE public."TypeExclusion" OWNER TO mailflow;

--
-- Name: TypeTravail; Type: TYPE; Schema: public; Owner: mailflow
--

CREATE TYPE public."TypeTravail" AS ENUM (
    'RELANCE',
    'VERIFICATION_REPONSE',
    'ESCALADE',
    'ARCHIVAGE',
    'SYNCHRO_BOITE',
    'RENOUVELLEMENT_ABONNEMENT',
    'TRANSFERT'
);


ALTER TYPE public."TypeTravail" OWNER TO mailflow;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO mailflow;

--
-- Name: absence; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.absence (
    id text NOT NULL,
    utilisateur_id text NOT NULL,
    debut timestamp(3) without time zone NOT NULL,
    fin timestamp(3) without time zone NOT NULL,
    motif text,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.absence OWNER TO mailflow;

--
-- Name: boite_suivie; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.boite_suivie (
    id text NOT NULL,
    adresse text NOT NULL,
    libelle text NOT NULL,
    fournisseur public."Fournisseur" DEFAULT 'MICROSOFT'::public."Fournisseur" NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    abonnement_id text,
    abonnement_expire_le timestamp(3) without time zone,
    jeton_delta text,
    derniere_synchro_le timestamp(3) without time zone,
    derniere_anomalie text,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modifie_le timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.boite_suivie OWNER TO mailflow;

--
-- Name: categorie; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.categorie (
    id text NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL,
    couleur text DEFAULT '#3d6675'::text NOT NULL,
    priorite public."Priorite" DEFAULT 'NORMALE'::public."Priorite" NOT NULL,
    ordre integer DEFAULT 0 NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    a_date_butoir boolean DEFAULT false NOT NULL,
    escalade_vers_id text,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modifie_le timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.categorie OWNER TO mailflow;

--
-- Name: correspondant; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.correspondant (
    id text NOT NULL,
    email text NOT NULL,
    nom text,
    organisation text,
    type public."TypeCorrespondant" DEFAULT 'AUTRE'::public."TypeCorrespondant" NOT NULL,
    notes text,
    actif boolean DEFAULT true NOT NULL,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modifie_le timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.correspondant OWNER TO mailflow;

--
-- Name: echange; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.echange (
    id text NOT NULL,
    numero integer NOT NULL,
    boite_id text NOT NULL,
    conversation_id text NOT NULL,
    sujet text NOT NULL,
    extrait text,
    web_link text,
    correspondant_id text NOT NULL,
    categorie_id text,
    priorite public."Priorite" DEFAULT 'NORMALE'::public."Priorite" NOT NULL,
    statut public."StatutEchange" DEFAULT 'A_QUALIFIER'::public."StatutEchange" NOT NULL,
    responsable_id text,
    recu_le timestamp(3) without time zone NOT NULL,
    echeance timestamp(3) without time zone,
    date_butoir timestamp(3) without time zone,
    prochaine_relance_le timestamp(3) without time zone,
    derniere_relance_le timestamp(3) without time zone,
    nb_relances integer DEFAULT 0 NOT NULL,
    repondu_le timestamp(3) without time zone,
    reponse_message_id text,
    reponse_par_id text,
    canal_reponse public."CanalReponse",
    motif_cloture text,
    a_piece_jointe boolean DEFAULT false NOT NULL,
    archive_le timestamp(3) without time zone,
    archive_url text,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modifie_le timestamp(3) without time zone NOT NULL,
    recherche tsvector GENERATED ALWAYS AS ((setweight(to_tsvector('french'::regconfig, COALESCE(sujet, ''::text)), 'A'::"char") || setweight(to_tsvector('french'::regconfig, COALESCE(extrait, ''::text)), 'B'::"char"))) STORED,
    CONSTRAINT echange_motif_obligatoire CHECK (((statut <> 'SANS_SUITE'::public."StatutEchange") OR (motif_cloture IS NOT NULL))),
    CONSTRAINT echange_nb_relances_positif CHECK ((nb_relances >= 0)),
    CONSTRAINT echange_reponse_datee CHECK (((statut <> 'REPONDU'::public."StatutEchange") OR (repondu_le IS NOT NULL)))
);


ALTER TABLE public.echange OWNER TO mailflow;

--
-- Name: echange_numero_seq; Type: SEQUENCE; Schema: public; Owner: mailflow
--

CREATE SEQUENCE public.echange_numero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.echange_numero_seq OWNER TO mailflow;

--
-- Name: echange_numero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: mailflow
--

ALTER SEQUENCE public.echange_numero_seq OWNED BY public.echange.numero;


--
-- Name: evenement; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.evenement (
    id text NOT NULL,
    type public."TypeEvenement" NOT NULL,
    acteur public."Acteur" DEFAULT 'SYSTEME'::public."Acteur" NOT NULL,
    utilisateur_id text,
    echange_id text,
    libelle text NOT NULL,
    valeur_avant jsonb,
    valeur_apres jsonb,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.evenement OWNER TO mailflow;

--
-- Name: expediteur_exclu; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.expediteur_exclu (
    id text NOT NULL,
    type public."TypeExclusion" DEFAULT 'ADRESSE'::public."TypeExclusion" NOT NULL,
    valeur text NOT NULL,
    motif text,
    actif boolean DEFAULT true NOT NULL,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.expediteur_exclu OWNER TO mailflow;

--
-- Name: jour_ferie; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.jour_ferie (
    id text NOT NULL,
    date date NOT NULL,
    libelle text NOT NULL
);


ALTER TABLE public.jour_ferie OWNER TO mailflow;

--
-- Name: message; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.message (
    id text NOT NULL,
    echange_id text NOT NULL,
    boite_id text NOT NULL,
    internet_message_id text NOT NULL,
    message_id_fournisseur text,
    in_reply_to text,
    "references" text[] DEFAULT ARRAY[]::text[],
    sens public."SensMessage" NOT NULL,
    expediteur text NOT NULL,
    destinataires text[] DEFAULT ARRAY[]::text[],
    copie text[] DEFAULT ARRAY[]::text[],
    sujet text NOT NULL,
    extrait text,
    date_message timestamp(3) without time zone NOT NULL,
    a_piece_jointe boolean DEFAULT false NOT NULL,
    est_automatique boolean DEFAULT false NOT NULL,
    est_non_remise boolean DEFAULT false NOT NULL,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.message OWNER TO mailflow;

--
-- Name: modele_message; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.modele_message (
    id text NOT NULL,
    code text NOT NULL,
    libelle text NOT NULL,
    sujet text NOT NULL,
    corps text NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modifie_le timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.modele_message OWNER TO mailflow;

--
-- Name: parametre; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.parametre (
    cle text NOT NULL,
    valeur jsonb NOT NULL,
    libelle text NOT NULL,
    modifie_le timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.parametre OWNER TO mailflow;

--
-- Name: piece_jointe; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.piece_jointe (
    id text NOT NULL,
    message_id text NOT NULL,
    nom_origine text NOT NULL,
    type_mime text NOT NULL,
    taille_octets bigint NOT NULL,
    empreinte text,
    cle_stockage text,
    telecharge_le timestamp(3) without time zone,
    est_incorporee boolean DEFAULT false NOT NULL,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.piece_jointe OWNER TO mailflow;

--
-- Name: regle_relance; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.regle_relance (
    id text NOT NULL,
    categorie_id text NOT NULL,
    ordre integer NOT NULL,
    delai_jours_ouvres integer NOT NULL,
    destinataire public."DestinataireRelance" DEFAULT 'PROPRIETAIRE'::public."DestinataireRelance" NOT NULL,
    copie_a text[] DEFAULT ARRAY[]::text[],
    modele_id text,
    actif boolean DEFAULT true NOT NULL,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modifie_le timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.regle_relance OWNER TO mailflow;

--
-- Name: relance; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.relance (
    id text NOT NULL,
    echange_id text NOT NULL,
    ordre integer NOT NULL,
    destinataire_id text NOT NULL,
    copie_a text[] DEFAULT ARRAY[]::text[],
    modele_id text,
    statut public."StatutRelance" DEFAULT 'ENVOYEE'::public."StatutRelance" NOT NULL,
    envoyee_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    message_id_envoye text,
    erreur text,
    cle_idempotence text NOT NULL
);


ALTER TABLE public.relance OWNER TO mailflow;

--
-- Name: travail_planifie; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.travail_planifie (
    id text NOT NULL,
    type public."TypeTravail" NOT NULL,
    echange_id text,
    executer_a timestamp(3) without time zone NOT NULL,
    statut public."StatutTravail" DEFAULT 'EN_ATTENTE'::public."StatutTravail" NOT NULL,
    tentatives integer DEFAULT 0 NOT NULL,
    derniere_erreur text,
    verrou_par text,
    verrou_a timestamp(3) without time zone,
    charge jsonb,
    cle_idempotence text NOT NULL,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    termine_le timestamp(3) without time zone
);


ALTER TABLE public.travail_planifie OWNER TO mailflow;

--
-- Name: utilisateur; Type: TABLE; Schema: public; Owner: mailflow
--

CREATE TABLE public.utilisateur (
    id text NOT NULL,
    email text NOT NULL,
    nom_complet text NOT NULL,
    initiales text,
    avatar_url text,
    fonction text,
    role public."Role" DEFAULT 'RESPONSABLE'::public."Role" NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    entra_object_id text,
    suppleant_id text,
    cree_le timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modifie_le timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.utilisateur OWNER TO mailflow;

--
-- Name: echange numero; Type: DEFAULT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.echange ALTER COLUMN numero SET DEFAULT nextval('public.echange_numero_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
e42847fd-be06-4ad6-b073-9014eb7b9258	e47ab48cbc96d1bcb6c3f71202304b21be38d9c60f0196e945d2dd81aba43afb	2026-09-06 23:42:04.909196+00	20260906234204_socle	\N	\N	2026-09-06 23:42:04.657652+00	1
32b8b1ea-6f0d-4311-a82e-4f630e2fc7a2	82ff784ad4c1a162b6d99d113f8f1638e34afdb71f7231472d328efcddadd87e	2026-09-06 23:42:42.241213+00	20260906234500_index_partiels	\N	\N	2026-09-06 23:42:42.133369+00	1
671553b2-aa3c-46a2-bcda-fcd4a81faed1	b46d6e439a0d2d2fd0d27e7b3be6bfca956fda7616702b84d4fa26b141b094a4	2026-09-06 23:42:42.611241+00	20260906234600_recherche	\N	\N	2026-09-06 23:42:42.242663+00	1
97b2af63-889f-4908-91cd-bde69af752e6	114ca40c965e93d2296f5a3e0ed17495530db9bedb184ac0640bb74ddfc91b7c	2026-09-10 17:04:20.92746+00	20260910180000_type_travail_transfert	\N	\N	2026-09-10 17:04:20.904272+00	1
\.


--
-- Data for Name: absence; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.absence (id, utilisateur_id, debut, fin, motif, cree_le) FROM stdin;
\.


--
-- Data for Name: boite_suivie; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.boite_suivie (id, adresse, libelle, fournisseur, actif, abonnement_id, abonnement_expire_le, jeton_delta, derniere_synchro_le, derniere_anomalie, cree_le, modifie_le) FROM stdin;
cmtrb23a9000a04g5k7c2tjsx	administration@exemple-mining.ml	Administration du site (démonstration)	MICROSOFT	f	\N	2026-09-09 10:24:00	\N	2026-09-07 10:18:00	\N	2026-09-07 13:57:37.953	2026-09-08 09:29:32.349
cmtrr5oa8000020g5zpr8enij	dec@samko.group	Boîte suivie dec@samko.group	IMAP	t	\N	\N	{"uidValiditeEntrant":1703584428,"dernierUidEntrant":4553,"uidValiditeSortant":1703584430,"dernierUidSortant":410}	2026-09-10 19:29:56.631	\N	2026-09-07 21:28:18.992	2026-09-10 19:29:56.647
\.


--
-- Data for Name: categorie; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.categorie (id, code, libelle, couleur, priorite, ordre, actif, a_date_butoir, escalade_vers_id, cree_le, modifie_le) FROM stdin;
cmtqgt57h00039gg538o7p8fy	DATE_BUTOIR	Date butoir imposée (tutelle, douane, fiscalité)	#a92a20	CRITIQUE	1	t	t	\N	2026-09-06 23:50:52.061	2026-09-06 23:51:12.112
cmtqgt58400069gg551dxuk92	APPRO	Approvisionnement, logistique, transit	#a06a06	HAUTE	2	t	f	\N	2026-09-06 23:50:52.084	2026-09-06 23:51:12.127
cmtqgt58f000a9gg5l8lc9s0l	COMMERCIAL	Commercial, offres, contrats	#3d6675	NORMALE	3	t	f	\N	2026-09-06 23:50:52.095	2026-09-06 23:51:12.139
cmtqgt58q000e9gg50mg8f4oa	TECHNIQUE	Technique, exploitation	#2b7048	HAUTE	4	t	f	\N	2026-09-06 23:50:52.106	2026-09-06 23:51:12.154
cmtqgt58z000i9gg5lw4xh259	ADMIN	Administratif courant, personnel	#5c6669	BASSE	5	t	f	\N	2026-09-06 23:50:52.115	2026-09-06 23:51:12.164
\.


--
-- Data for Name: correspondant; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.correspondant (id, email, nom, organisation, type, notes, actif, cree_le, modifie_le) FROM stdin;
cmtrb23ai000b04g5xvkp00hr	ops@transit-sahel.example	Amadou Sow	Transit Sahel SARL	FOURNISSEUR	\N	t	2026-09-07 13:57:37.962	2026-09-07 13:57:37.962
cmtrb23bd000c04g5joyv7tcm	bureau.kayes@douanes.example	Bureau de Kayes	Direction des Douanes	AUTORITE	\N	t	2026-09-07 13:57:37.993	2026-09-07 13:57:37.993
cmtrb23bn000d04g5yqo5oqvz	ventes@foragex.example	Claire Nguyen	Foragex Industries	FOURNISSEUR	\N	t	2026-09-07 13:57:38.003	2026-09-07 13:57:38.003
cmtrb23bu000e04g5srk6bxy1	controle@impots.example	Brigade de vérification	Administration fiscale	AUTORITE	\N	t	2026-09-07 13:57:38.01	2026-09-07 13:57:38.01
cmtrb23c7000f04g5pivrq8fq	commercial@sahel-equipements.example	Ibrahim Touré	Sahel Équipements	FOURNISSEUR	\N	t	2026-09-07 13:57:38.023	2026-09-07 13:57:38.023
cmtrb23cb000g04g5qu48gky9	logistique@carbura.example	Awa Diarra	Carbura Distribution	FOURNISSEUR	\N	t	2026-09-07 13:57:38.027	2026-09-07 13:57:38.027
cmtrb23ck000h04g5hvrnxvpr	contact@geoconseil.example	Paul Mercier	GéoConseil	PARTENAIRE	\N	t	2026-09-07 13:57:38.036	2026-09-07 13:57:38.036
cmtrb23cr000i04g5t2m77izk	sinistres@mutuelle-pro.example	Service sinistres	Mutuelle Pro	PARTENAIRE	\N	t	2026-09-07 13:57:38.043	2026-09-07 13:57:38.043
cmtrb23cu000j04g5rdaj9ibu	facturation@energie-sud.example	Service clients	Énergie Sud	FOURNISSEUR	\N	t	2026-09-07 13:57:38.046	2026-09-07 13:57:38.046
cmtrb23d4000k04g5op58j44q	resultats@labo-analyse.example	Dr Sanogo	Laboratoire d'analyses	FOURNISSEUR	\N	t	2026-09-07 13:57:38.056	2026-09-07 13:57:38.056
cmtrr5ypd000120g5dkj6l1su	e-impot@dgi.gouv.ml	\N	\N	AUTRE	\N	t	2026-09-07 21:28:32.497	2026-09-07 21:28:32.497
cmtrr6an6000e20g5cu17jgy6	bsissoko@proman-project.com	Bréma SISSOKO	\N	AUTRE	\N	t	2026-09-07 21:28:47.971	2026-09-07 21:35:17.215
cmtrr7iqq003020g54zpx05fg	catchall@orpheus.odoo.com	ORPHEUS DREAM VILLAGE HOTEL	\N	AUTRE	\N	t	2026-09-07 21:29:45.122	2026-09-07 21:35:48.774
cmtsgo5uf000jy4g55nmywly0	laya.sidibe@cm.sanlamallianz.com	Laya Sidibe (MLSL)	\N	AUTRE	\N	t	2026-09-08 09:22:31.96	2026-09-08 09:22:31.96
cmtrr6jio000r20g5qdsb0ypc	msamake@samko-conseil.com	Massaoulé SAMAKE	\N	AUTRE	\N	t	2026-09-07 21:28:59.472	2026-09-07 21:29:14.352
cmtsgo68g000ny4g572swp0g5	rebecca.kangaze@cm.sanlamallianz.com	Rebecca Kanga Ze (SanlamAllianz SN VIE)	\N	AUTRE	\N	t	2026-09-08 09:22:32.465	2026-09-08 09:22:32.465
cmtsgo77u000yy4g5rq302ek5	mlefebvre@proman.lu	Mathieu Lefebvre	\N	AUTRE	\N	t	2026-09-08 09:22:33.738	2026-09-08 09:22:33.738
cmtsgo7kh0014y4g572l455xa	drame1fr@yahoo.fr	morike drame	\N	AUTRE	\N	t	2026-09-08 09:22:34.194	2026-09-08 09:22:34.194
cmtsgo7vl0018y4g586lgplp8	no-reply-y0djikh8n06qjjpglijk0w@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:34.593	2026-09-08 09:22:34.593
cmtsgo8oj001iy4g5metevttp	no-reply-isbedpgpjng55ckepm0hew@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:35.635	2026-09-08 09:22:35.635
cmtsgo8u7001my4g5kmzvaaq7	no-reply-zdhqduunggzlgjytjvmeja@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:35.839	2026-09-08 09:22:35.839
cmtsgo8ze001qy4g5b4oeouwo	no-reply-st6rblwi-u_nwgkp75r-rq@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:36.026	2026-09-08 09:22:36.026
cmtsgo95l001uy4g5s99bbs43	no-reply-qisj46tjfk7splttmwglka@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:36.249	2026-09-08 09:22:36.249
cmtsgo9bc001yy4g5czd19r9x	no-reply-qt1ru8tt20qgbty1rrfqhg@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:36.456	2026-09-08 09:22:36.456
cmtsgo9i60022y4g58dqaxa6a	no-reply-po9rztvfp90ulor5h7h2tw@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:36.702	2026-09-08 09:22:36.702
cmtsgoc39002uy4g514voom8j	no-reply-rf_vxfiuf4lhjvrtxogvrw@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:40.053	2026-09-08 09:22:40.053
cmtsgoc8g002yy4g5fdhcsux2	no-reply-nzvw0xa_iv8o9b3b12lv-a@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:40.24	2026-09-08 09:22:40.24
cmtsgocdn0032y4g5xp50r7tg	no-reply-brfo5imx69igrofh4ugnua@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:40.427	2026-09-08 09:22:40.427
cmtsgociw0036y4g52lt3aexg	no-reply-8t3reknssffaltjwfadftq@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:40.616	2026-09-08 09:22:40.616
cmtsgocns003ay4g5snfghxa8	no-reply-gitqovv6evfzjal-fhzira@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:40.792	2026-09-08 09:22:40.792
cmtsgocsu003ey4g5ndwlh7tl	no-reply-ycu-afsefjgc91-1txopkq@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:40.974	2026-09-08 09:22:40.974
cmtsgod26003iy4g5y5alowk1	no-reply-j6ondfhmonnllkmultma_q@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:41.31	2026-09-08 09:22:41.31
cmtsgodas003my4g5ode9ew3v	no-reply-gzbanido1_zx-vripj6otq@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:41.62	2026-09-08 09:22:41.62
cmtsgodl5003qy4g5pff8a21s	bober@odoo.com	Borel Berirembo (bober)	\N	AUTRE	\N	t	2026-09-08 09:22:41.993	2026-09-08 09:22:41.993
cmtsgodwv003uy4g5qsis4oi8	courrier.sgccga@finances.ml	Secrétariat CC Gel des avoirs	\N	AUTRE	\N	t	2026-09-08 09:22:42.415	2026-09-08 09:22:42.415
cmtsgohn3004sy4g5nob3lbvs	no-reply-zl5_py4yj8i8e_vzzb6elw@mail.anthropic.com	Anthropic	\N	AUTRE	\N	t	2026-09-08 09:22:47.247	2026-09-08 09:22:47.247
cmtsgoicb0054y4g53ifpengz	bekaye.b.samake@orpheusdreamvillage.com	\N	\N	AUTRE	\N	t	2026-09-08 09:22:48.155	2026-09-08 09:22:48.155
cmtsgonr3006qy4g5uzjl682k	n.traore@t-mak.org	Nouhoum TRAORE	\N	AUTRE	\N	t	2026-09-08 09:22:55.167	2026-09-08 09:22:55.41
cmtsgoqks007ky4g5tgailvzu	bureau@dc-max.tech	musa f	\N	AUTRE	\N	t	2026-09-08 09:22:58.828	2026-09-08 09:22:58.828
cmtsgo7jd0012y4g5diuclqmn	akobasky@proman.lu	Anastasiia Kobasky	\N	AUTRE	\N	t	2026-09-08 09:22:34.153	2026-09-08 09:22:59.866
cmtsgohss004wy4g5368a0ygu	ghislaineflore.tchoudjem@care.org	Ghislaine Tchoudjem	\N	AUTRE	\N	t	2026-09-08 09:22:47.452	2026-09-10 18:47:04.114
cmtvvpvac0004s4g5rxsyfjwr	lester.mendiola@care.org	Lester Mendiola	\N	AUTRE	\N	t	2026-09-10 18:47:04.356	2026-09-10 18:47:04.356
cmtvvpv780002s4g5r9g2p58d	kimrose.bagawisan@care.org	Kim Rose Bagawisan	\N	AUTRE	\N	t	2026-09-10 18:47:04.244	2026-09-10 18:47:04.386
cmtvvpxm9000ns4g53aczuf3n	essai-mailflow@client-externe.example	Client d'essai	\N	AUTRE	\N	t	2026-09-10 18:47:07.377	2026-09-10 19:27:10.725
cmtvx5fy50000h8g5fo0g6pzh	mamounberthe@gmail.com	Mamoun Berthe	\N	AUTRE	\N	t	2026-09-10 19:27:10.589	2026-09-10 19:29:55.959
\.


--
-- Data for Name: echange; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.echange (id, numero, boite_id, conversation_id, sujet, extrait, web_link, correspondant_id, categorie_id, priorite, statut, responsable_id, recu_le, echeance, date_butoir, prochaine_relance_le, derniere_relance_le, nb_relances, repondu_le, reponse_message_id, reponse_par_id, canal_reponse, motif_cloture, a_piece_jointe, archive_le, archive_url, cree_le, modifie_le) FROM stdin;
cmtvvpvp30008s4g5toty9vte	229	cmtrr5oa8000020g5zpr8enij	<9e4fadc2-0e7d-0ea2-805c-8719fb56a1f7@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	\N	NORMALE	A_QUALIFIER	\N	2026-09-09 15:37:50	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-10 18:47:04.887	2026-09-10 18:47:04.887
cmtvvpw81000bs4g5je7hoei5	230	cmtrr5oa8000020g5zpr8enij	<651e6524-a33d-eba3-f52e-637812fdb608@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	\N	NORMALE	A_QUALIFIER	\N	2026-09-09 17:00:29	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-10 18:47:05.569	2026-09-10 18:47:05.569
cmtsgoa8z0029y4g53l3ery6y	155	cmtrr5oa8000020g5zpr8enij	<461261de-1638-ddfd-bcbe-bfa4ad0870b8@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-11 11:26:36	2026-09-09 11:19:41.547	\N	2026-08-14 11:26:36	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:37.668	2026-09-09 11:19:43.059
cmtsgoav2002fy4g5otcyvmwt	157	cmtrr5oa8000020g5zpr8enij	<1be7ea93-a773-368f-48fd-4e12acf13524@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-11 11:32:56	2026-09-09 11:19:41.547	\N	2026-08-14 11:32:56	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:38.462	2026-09-09 11:19:43.133
cmtsgobga002ly4g5rk9g0koh	159	cmtrr5oa8000020g5zpr8enij	<4bb74b5c-d9ea-1930-b73c-21df06cdcbea@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-11 11:43:55	2026-09-09 11:19:41.547	\N	2026-08-14 11:43:55	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:39.226	2026-09-09 11:19:43.176
cmtrrep3w000b7gg5x9obo8vt	123	cmtrr5oa8000020g5zpr8enij	<AM8P193MB11061F92CA04C44AB3EEE3C9F1ED2@AM8P193MB1106.EURP193.PROD.OUTLOOK.COM>	RE: Demande d'accès Odoo pour un nouveau collaborateur	Bonjour @stangara@samko.group<mailto:stangara@samko.group>, J’espère que vous allez bien, Merci de revoir le rapport financier dans Odoo. Les garanties ont et leurs montants ont disparus sans aucune trace merci de revoi…	\N	cmtrr6an6000e20g5cu17jgy6	cmtqgt58q000e9gg50mg8f4oa	NORMALE	EN_ATTENTE	cmtrb239k000904g5zjr5hvz1	2026-09-03 11:12:08	2026-09-09 11:19:41.547	\N	2026-09-04 11:12:08	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:19.964	2026-09-09 11:19:43.228
cmtsgocij0033y4g5nz5cvmya	164	cmtrr5oa8000020g5zpr8enij	<r9R2gS7rTemy2eITtlEmQA@geopod-ismtpd-22>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 12:45:27		\N	cmtsgocdn0032y4g5xp50r7tg	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 12:45:27	2026-09-09 11:19:41.547	\N	2026-08-13 12:45:27	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:40.603	2026-09-09 11:19:43.353
cmtsgocd9002zy4g5sadj4hh5	163	cmtrr5oa8000020g5zpr8enij	<uo9a200dThu4EuOht7Axgw@geopod-ismtpd-59>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 12:37:20		\N	cmtsgoc8g002yy4g5fdhcsux2	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 12:37:20	2026-09-09 11:19:41.547	\N	2026-08-13 12:37:20	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:40.413	2026-09-09 11:19:43.473
cmtsgocne0037y4g5jie9rcwi	165	cmtrr5oa8000020g5zpr8enij	<XchqH5IVTi2F_guWxTQO9g@geopod-ismtpd-22>	Security alert: new trusted device added to your Claude account		\N	cmtsgociw0036y4g52lt3aexg	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 12:46:06	2026-09-09 11:19:41.547	\N	2026-08-13 12:46:06	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:40.778	2026-09-09 11:19:43.483
cmtsgob5v002iy4g5xd5u2h8a	158	cmtrr5oa8000020g5zpr8enij	<43ac4465-78be-dda2-c3ee-5ba52370fe03@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-11 11:40:17	2026-09-09 11:19:41.547	\N	2026-08-14 11:40:17	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:38.851	2026-09-09 11:19:43.573
cmtsgobrr002oy4g5nhzegcu1	160	cmtrr5oa8000020g5zpr8enij	<c5a942be-9ab7-476c-451a-53755d1f2b3a@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-11 11:45:56	2026-09-09 11:19:41.547	\N	2026-08-14 11:45:56	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:39.639	2026-09-09 11:19:43.584
cmtvvpwl2000es4g53vo9hgp1	231	cmtrr5oa8000020g5zpr8enij	<41ea201d-ea45-65f7-e875-970e0995a619@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	\N	NORMALE	A_QUALIFIER	\N	2026-09-10 15:55:23	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-10 18:47:06.039	2026-09-10 18:47:06.039
cmtvvpx45000hs4g526kj3ptg	232	cmtrr5oa8000020g5zpr8enij	<aa6d04bd-703f-fe7f-5622-7a06a44605cd@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	\N	NORMALE	A_QUALIFIER	\N	2026-09-10 15:56:03	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-10 18:47:06.725	2026-09-10 18:47:06.725
cmtsgoewx0041y4g57zq8vadx	173	cmtrr5oa8000020g5zpr8enij	<b0bfce7f-7fe7-081c-452d-6050d08a6fb7@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-14 11:25:36	2026-09-09 11:19:41.547	\N	2026-08-19 11:25:36	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:43.713	2026-09-09 11:19:43.197
cmtsgofgo0047y4g5szcewaov	175	cmtrr5oa8000020g5zpr8enij	<8efdcdc7-b529-4748-15d9-044b861a6978@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-14 11:26:18	2026-09-09 11:19:41.547	\N	2026-08-19 11:26:18	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:44.424	2026-09-09 11:19:43.207
cmtsgoga6004dy4g5m91sslcc	177	cmtrr5oa8000020g5zpr8enij	<438df99e-d1cb-88b7-e421-2da435876690@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-14 17:05:46	2026-09-09 11:19:41.547	\N	2026-08-19 17:05:46	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:45.486	2026-09-09 11:19:43.218
cmtsgoc80002vy4g5sebz4w09	162	cmtrr5oa8000020g5zpr8enij	<YT1ftsygQKS8eRI-C_D2nQ@geopod-ismtpd-64>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 12:37:13		\N	cmtsgoc39002uy4g514voom8j	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 12:37:13	2026-09-09 11:19:41.547	\N	2026-08-13 12:37:13	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:40.224	2026-09-09 11:19:43.343
cmtsgod1p003fy4g5l8pb2dxb	167	cmtrr5oa8000020g5zpr8enij	<EvH6TfF7TDqlzQVct1TVEg@geopod-ismtpd-56>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 14:57:18		\N	cmtsgocsu003ey4g5ndwlh7tl	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 14:57:18	2026-09-09 11:19:41.547	\N	2026-08-13 14:57:18	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:41.293	2026-09-09 11:19:43.366
cmtsgodks003ny4g57hptcv1r	169	cmtrr5oa8000020g5zpr8enij	<-raIQtm4Te6TyJ4bqPeqrA@geopod-ismtpd-50>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-12 17:29:35		\N	cmtsgodas003my4g5ode9ew3v	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-12 17:29:36	2026-09-09 11:19:41.547	\N	2026-08-14 17:29:36	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:41.98	2026-09-09 11:19:43.376
cmtsgod9y003jy4g5qkwtv9q8	168	cmtrr5oa8000020g5zpr8enij	<8nKj9eE7SIWZfrK8BwKN-g@geopod-ismtpd-57>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 21:42:45		\N	cmtsgod26003iy4g5y5alowk1	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 21:42:45	2026-09-09 11:19:41.547	\N	2026-08-14 08:00:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:41.59	2026-09-09 11:19:43.5
cmtsgof5x0044y4g5cpswnx1h	174	cmtrr5oa8000020g5zpr8enij	<85ba727d-039c-9923-9a78-85e36c7b23a7@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-14 11:25:56	2026-09-09 11:19:41.547	\N	2026-08-19 11:25:56	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:44.037	2026-09-09 11:19:43.604
cmtsgofu5004ay4g5hdd3rvxy	176	cmtrr5oa8000020g5zpr8enij	<77987af7-cae0-0098-53d5-479be8208ed5@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-14 15:36:16	2026-09-09 11:19:41.547	\N	2026-08-19 15:36:16	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:44.909	2026-09-09 11:19:43.615
cmtvvpxl9000ks4g5ewwlg35x	233	cmtrr5oa8000020g5zpr8enij	<dc0e6aa3-b272-015e-d06c-cdca26eaa0a2@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	\N	NORMALE	A_QUALIFIER	\N	2026-09-10 15:56:42	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-10 18:47:07.341	2026-09-10 18:47:07.341
cmtvvpxvk000os4g5nutihx80	234	cmtrr5oa8000020g5zpr8enij	<mailflow-e2e-1789066018252@client-externe.example>	MAILFLOW-E2E 2026-09-10T18:46 — devis à transférer	Version texte du message d'essai MailFlow — accents : é à ù ç ñ.	\N	cmtvvpxm9000ns4g53aczuf3n	\N	NORMALE	A_QUALIFIER	\N	2026-09-10 18:46:58	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	t	\N	\N	2026-09-10 18:47:07.712	2026-09-10 18:47:07.712
cmtrrexyq000k7gg5fion4por	126	cmtrr5oa8000020g5zpr8enij	<09489416-5e84-ef6b-b356-57639560dba2@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-07 13:13:44	2026-09-10 13:13:44	\N	2026-09-10 13:13:44	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:31.442	2026-09-09 11:03:03.947
cmtrrf0hv000n7gg5wju6b06i	127	cmtrr5oa8000020g5zpr8enij	<187dcc50-c203-ee02-e21f-c78a4e1d3480@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-07 13:14:43	2026-09-10 13:14:43	\N	2026-09-10 13:14:43	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:34.723	2026-09-09 11:03:03.999
cmtrrf3ht000q7gg5rgb7h7im	128	cmtrr5oa8000020g5zpr8enij	<2625ed9d-47a6-8348-b0d8-620add603988@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-07 13:15:44	2026-09-10 13:15:44	\N	2026-09-10 13:15:44	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:38.609	2026-09-09 11:03:04.045
cmtrrf6kk000t7gg5u55w0fxz	129	cmtrr5oa8000020g5zpr8enij	<5c5914ed-3cda-f694-1c35-fed603e9935f@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-07 13:30:43	2026-09-10 13:30:43	\N	2026-09-10 13:30:43	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:42.596	2026-09-09 11:03:04.091
cmtrrev41000h7gg5pz5mbfwy	125	cmtrr5oa8000020g5zpr8enij	<d8a2a701-96b8-d201-6a00-03de37837c46@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-03 11:15:11	2026-09-09 11:19:41.547	\N	2026-09-08 11:15:11	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:27.745	2026-09-09 11:19:43.258
cmtsgo9nf0023y4g5ox3bvpeg	153	cmtrr5oa8000020g5zpr8enij	<RJZnkgVbQz2r-AVS1YhU5w@geopod-ismtpd-51>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:55:50		\N	cmtsgo9i60022y4g58dqaxa6a	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 10:55:50	2026-09-09 11:19:41.547	\N	2026-08-13 10:55:50	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:36.891	2026-09-09 11:19:43.279
cmtrrerri000e7gg5kcbczxkv	124	cmtrr5oa8000020g5zpr8enij	<9440314b-8996-dc24-972b-5df8efbabf88@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-03 11:13:51	2026-09-09 11:19:41.547	\N	2026-09-08 11:13:51	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:23.406	2026-09-09 11:19:43.636
cmtrb2400001b04g52crh2evj	71	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-011	Relance facture FA-2026-1187	Sauf erreur de notre part, la facture ci-dessous demeure impayée à ce jour…	https://outlook.office365.com/	cmtrb23c7000f04g5pivrq8fq	cmtqgt58z000i9gg5lw4xh259	NORMALE	EN_ATTENTE	cmtrb238z000804g5igkoyh1j	2026-09-07 06:24:00	2026-09-10 08:00:00	\N	2026-09-10 08:00:00	\N	0	\N	\N	\N	\N	\N	t	\N	\N	2026-09-07 13:57:38.88	2026-09-09 11:03:04.135
cmtvx5gke0003h8g5n2fufqi6	235	cmtrr5oa8000020g5zpr8enij	<mailflow-e2e-1789068425614@client-externe.example>	MAILFLOW-E2E 2026-09-10T19:27 — devis à transférer	Version texte du message d'essai MailFlow — accents : é à ù ç ñ.	\N	cmtvvpxm9000ns4g53aczuf3n	\N	NORMALE	A_QUALIFIER	\N	2026-09-10 19:27:05	\N	\N	\N	\N	0	\N	\N	\N	\N	\N	t	\N	\N	2026-09-10 19:27:11.39	2026-09-10 19:27:11.39
cmtrb23td000w04g5nkqkl1r1	64	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-004	Panne compresseur atelier 2, devis de réparation	Suite à notre intervention de vendredi, veuillez trouver le devis de remise en état…	https://outlook.office365.com/	cmtrb23c7000f04g5pivrq8fq	cmtqgt58q000e9gg50mg8f4oa	HAUTE	RELANCE	cmtrb239k000904g5zjr5hvz1	2026-09-04 10:24:00	2026-09-09 11:19:41.547	\N	2026-09-07 10:24:00	2026-09-07 04:24:00	1	\N	\N	\N	\N	\N	t	\N	\N	2026-09-07 13:57:38.641	2026-09-09 11:19:43.148
cmtrb23v9001104g5ixlv9erv	66	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-006	Programme de livraison gasoil, semaine 38	Merci de confirmer les volumes et les créneaux de déchargement pour la semaine prochaine…	https://outlook.office365.com/	cmtrb23cb000g04g5qu48gky9	cmtqgt58400069gg551dxuk92	HAUTE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-06 14:24:00	2026-09-09 11:19:41.547	\N	2026-09-08 08:00:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 13:57:38.71	2026-09-09 11:19:43.165
cmtrb23zd001904g59cyl5atc	70	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-010	Demande de rendez-vous, présentation de nos services d'ingénierie	Notre cabinet accompagne les opérateurs miniers de la sous-région et souhaiterait…	https://outlook.office365.com/	cmtrb23ck000h04g5hvrnxvpr	cmtqgt58f000a9gg5l8lc9s0l	BASSE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-09-07 08:24:00	2026-09-09 11:19:41.547	\N	2026-09-09 08:24:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 13:57:38.857	2026-09-09 11:19:43.269
cmtrb23ua000z04g5180m4y5p	65	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-005	Proposition de contrat cadre, forage et sondage 2027	Comme convenu lors de notre échange, voici notre proposition de contrat cadre…	https://outlook.office365.com/	cmtrb23bn000d04g5yqo5oqvz	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-09-06 10:24:00	2026-09-09 11:19:41.547	\N	2026-09-09 08:00:00	\N	0	\N	\N	\N	\N	\N	t	\N	\N	2026-09-07 13:57:38.675	2026-09-09 11:19:43.288
cmtrb23wh001304g5k77we3z4	67	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-007	Résultats d'analyses, campagne d'août	Les résultats de la campagne du mois d'août sont disponibles, un point vous est proposé…	https://outlook.office365.com/	cmtrb23d4000k04g5op58j44q	cmtqgt58q000e9gg50mg8f4oa	NORMALE	EN_ATTENTE	cmtrb239k000904g5zjr5hvz1	2026-09-05 10:24:00	2026-09-09 11:19:41.547	\N	2026-09-08 08:00:00	\N	0	\N	\N	\N	\N	\N	t	\N	\N	2026-09-07 13:57:38.753	2026-09-09 11:19:43.298
cmtrb23yh001704g5kjlzolmu	69	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-009	Révision tarifaire du poste de livraison haute tension	À compter du prochain trimestre, la grille applicable au poste de livraison évolue…	https://outlook.office365.com/	cmtrb23cu000j04g5rdaj9ibu	cmtqgt58z000i9gg5lw4xh259	NORMALE	EN_ATTENTE	cmtrb238z000804g5igkoyh1j	2026-09-04 10:24:00	2026-09-09 11:19:41.547	\N	2026-09-09 10:24:00	\N	0	\N	\N	\N	\N	\N	t	\N	\N	2026-09-07 13:57:38.826	2026-09-09 11:19:43.309
cmtrb23sb000t04g5d4up9gy7	63	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-003	Régularisation déclaration en détail n° 2026-0884	Il subsiste un écart entre la valeur déclarée et la facture fournisseur jointe…	https://outlook.office365.com/	cmtrb23bd000c04g5joyv7tcm	cmtqgt57h00039gg538o7p8fy	HAUTE	RELANCE	cmtrb238z000804g5igkoyh1j	2026-09-03 10:24:00	2026-09-09 11:19:41.547	2026-09-18 23:59:00	2026-09-08 10:24:00	2026-09-07 13:57:49.69	2	\N	\N	\N	\N	\N	t	\N	\N	2026-09-07 13:57:38.603	2026-09-09 11:19:43.334
cmtrb23r7000p04g5dwhra62p	62	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-002	Avis de vérification de comptabilité, exercices 2024 et 2025	Nous vous informons qu'une vérification de comptabilité sera engagée à compter du…	https://outlook.office365.com/	cmtrb23bu000e04g5srk6bxy1	cmtqgt57h00039gg538o7p8fy	CRITIQUE	ESCALADE	cmtrb238z000804g5igkoyh1j	2026-08-30 10:24:00	2026-09-05 10:24:00	2026-09-15 23:59:00	\N	2026-09-06 10:24:00	2	\N	\N	\N	\N	\N	t	\N	\N	2026-09-07 13:57:38.563	2026-09-07 13:57:38.563
cmtrb240h001d04g5aua0ffc7	72	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-012	Nouvelle grille de fret depuis Dakar	Veuillez trouver notre grille tarifaire révisée applicable au 1er octobre…	https://outlook.office365.com/	cmtrb23ai000b04g5xvkp00hr	cmtqgt58400069gg551dxuk92	BASSE	EN_ATTENTE	cmtrb239k000904g5zjr5hvz1	2026-09-07 04:24:00	2026-09-09 11:19:41.547	\N	2026-09-08 08:00:00	\N	0	\N	\N	\N	\N	\N	t	\N	\N	2026-09-07 13:57:38.897	2026-09-09 11:19:43.813
cmtrb23xw001504g5nqhuph65	68	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-008	Déclaration de sinistre véhicule de service, suite	Nous accusons réception de votre déclaration et sollicitons deux pièces complémentaires…	https://outlook.office365.com/	cmtrb23cr000i04g5t2m77izk	cmtqgt58z000i9gg5lw4xh259	BASSE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-09-05 10:24:00	2026-09-10 10:24:00	\N	2026-09-10 10:24:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 13:57:38.804	2026-09-07 13:57:38.804
cmtrb2418001f04g52d1kf34g	73	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-013	Confirmation de commande, pièces d'usure concasseur	Nous accusons réception de votre bon de commande n° BC-2026-0442…	https://outlook.office365.com/	cmtrb23bn000d04g5yqo5oqvz	cmtqgt58400069gg551dxuk92	NORMALE	REPONDU	cmtrb238n000704g585q1vjii	2026-09-03 10:24:00	2026-09-05 10:24:00	\N	\N	2026-09-06 10:24:00	1	2026-09-07 06:24:00	\N	cmtrb238n000704g585q1vjii	MAIL	\N	f	\N	\N	2026-09-07 13:57:38.924	2026-09-07 13:57:38.924
cmtrb2423001i04g5h7rkp7fo	74	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-014	Attestation de régularité fiscale, renouvellement	Votre demande d'attestation a été instruite, le document est disponible…	https://outlook.office365.com/	cmtrb23bu000e04g5srk6bxy1	cmtqgt58z000i9gg5lw4xh259	NORMALE	REPONDU	cmtrb238z000804g5igkoyh1j	2026-09-01 10:24:00	2026-09-04 10:24:00	\N	\N	\N	0	2026-09-06 08:24:00	\N	cmtrb238z000804g5igkoyh1j	MAIL	\N	f	\N	\N	2026-09-07 13:57:38.955	2026-09-07 13:57:38.955
cmtrb242n001k04g5i5kpdv2b	75	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-015	Planning d'intervention groupe électrogène de secours	Notre technicien peut intervenir mercredi ou jeudi, merci de nous indiquer…	https://outlook.office365.com/	cmtrb23c7000f04g5pivrq8fq	cmtqgt58q000e9gg50mg8f4oa	NORMALE	REPONDU	cmtrb239k000904g5zjr5hvz1	2026-09-04 10:24:00	2026-09-06 10:24:00	\N	\N	\N	0	2026-09-06 04:24:00	\N	cmtrb239k000904g5zjr5hvz1	MAIL	\N	f	\N	\N	2026-09-07 13:57:38.975	2026-09-07 13:57:38.975
cmtrb2432001m04g5kvjtqisg	76	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-016	Avenant au contrat de transport, clause de carburant	Comme discuté, voici l'avenant intégrant la clause d'indexation carburant…	https://outlook.office365.com/	cmtrb23ai000b04g5xvkp00hr	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	REPONDU	cmtrb2372000604g5852ipk4u	2026-08-31 10:24:00	2026-09-02 10:24:00	\N	\N	2026-09-04 10:24:00	2	2026-09-05 10:24:00	\N	cmtrb2372000604g5852ipk4u	MAIL	\N	t	\N	\N	2026-09-07 13:57:38.99	2026-09-07 13:57:38.99
cmtrb2440001q04g5rlflow4w	77	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-017	Procès-verbal de réception, station de pompage	Veuillez trouver le procès-verbal signé des deux parties…	https://outlook.office365.com/	cmtrb23c7000f04g5pivrq8fq	cmtqgt58q000e9gg50mg8f4oa	NORMALE	ARCHIVE	cmtrb239k000904g5zjr5hvz1	2026-08-14 10:24:00	2026-08-16 10:24:00	\N	\N	\N	0	2026-08-17 10:24:00	\N	cmtrb239k000904g5zjr5hvz1	MAIL	\N	t	2026-08-17 10:24:00	https://stockage.exemple-mining.ml/archives/17	2026-09-07 13:57:39.024	2026-09-07 13:57:39.024
cmtrb244v001s04g5tw30to96	78	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-018	Quitus douanier campagne d'importation 2025	Le quitus vous est délivré au titre des opérations de l'exercice écoulé…	https://outlook.office365.com/	cmtrb23bd000c04g5joyv7tcm	cmtqgt57h00039gg538o7p8fy	HAUTE	ARCHIVE	cmtrb238z000804g5igkoyh1j	2026-08-07 10:24:00	2026-08-10 10:24:00	\N	\N	\N	1	2026-08-11 10:24:00	\N	cmtrb238z000804g5igkoyh1j	MAIL	\N	t	2026-08-11 10:24:00	https://stockage.exemple-mining.ml/archives/18	2026-09-07 13:57:39.055	2026-09-07 13:57:39.055
cmtrb245k001v04g5m6789msx	79	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-019	Clôture du dossier de sinistre 2026-114	Le dossier est clos, l'indemnisation a été virée sur le compte indiqué…	https://outlook.office365.com/	cmtrb23cr000i04g5t2m77izk	cmtqgt58z000i9gg5lw4xh259	BASSE	ARCHIVE	cmtrb2372000604g5852ipk4u	2026-07-29 10:24:00	2026-08-01 10:24:00	\N	\N	\N	0	2026-08-02 10:24:00	\N	cmtrb2372000604g5852ipk4u	MAIL	\N	f	2026-08-02 10:24:00	https://stockage.exemple-mining.ml/archives/19	2026-09-07 13:57:39.08	2026-09-07 13:57:39.08
cmtrb246h001x04g5163378km	80	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-020	Rapport d'audit énergétique du site	Le rapport définitif intègre vos observations du mois dernier…	https://outlook.office365.com/	cmtrb23ck000h04g5hvrnxvpr	cmtqgt58q000e9gg50mg8f4oa	NORMALE	ARCHIVE	cmtrb2372000604g5852ipk4u	2026-07-17 10:24:00	2026-07-20 10:24:00	\N	\N	\N	0	2026-07-22 10:24:00	\N	cmtrb2372000604g5852ipk4u	MAIL	\N	t	2026-07-22 10:24:00	https://stockage.exemple-mining.ml/archives/20	2026-09-07 13:57:39.113	2026-09-07 13:57:39.113
cmtsgodwd003ry4g50ov00o56	170	cmtrr5oa8000020g5zpr8enij	<292029687077813.1766052299.422146320343018-openerp-6879861-sale.order@of34.odoo.com>	RE: Votre Gestionnaire de Compte Odoo	https://www.odoo.com/fr_FR/my/orders/7958134?access_token=eb25e509-8661-4ab1-876a-defbc3a64e20 ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ ͏ ​ …	\N	cmtsgodl5003qy4g5pff8a21s	cmtqgt58q000e9gg50mg8f4oa	NORMALE	EN_ATTENTE	cmtrb239k000904g5zjr5hvz1	2026-08-13 11:38:34	2026-09-09 11:19:41.547	\N	2026-08-14 11:38:34	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:42.397	2026-09-10 19:52:45.242
cmtrb23hw000l04g57uj226l1	61	cmtrb23a9000a04g5k7c2tjsx	AAQk-demo-001	Mainlevée conteneur MSKU 4471 bloqué au port	Le conteneur de pièces de rechange est immobilisé depuis jeudi, nous attendons votre pouvoir…	https://outlook.office365.com/	cmtrb23ai000b04g5xvkp00hr	cmtqgt58400069gg551dxuk92	CRITIQUE	RELANCE	cmtrb238n000704g585q1vjii	2026-09-02 10:24:00	2026-09-09 11:19:41.547	\N	2026-09-03 10:24:00	2026-09-07 13:57:49.508	3	\N	\N	\N	\N	\N	t	\N	\N	2026-09-07 13:57:38.228	2026-09-09 11:19:43.32
cmtsgo6v3000sy4g54o1w189t	141	cmtrr5oa8000020g5zpr8enij	<30e4acf1-ea6c-a1a1-9eb5-0ba5eeb319ca@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-07 09:46:15	2026-09-09 11:19:41.547	\N	2026-08-12 09:46:15	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:33.279	2026-09-09 11:19:43.874
cmtrrehgl00017gg5c6lkpi6n	120	cmtrr5oa8000020g5zpr8enij	<75959f0c-12ab-0d1d-7c44-019ff6a1111c@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-03 08:21:52	2026-09-09 11:19:41.547	\N	2026-09-08 08:21:52	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:10.053	2026-09-09 11:19:44.254
cmtrrfbbm000z7gg5btt0mkpo	131	cmtrr5oa8000020g5zpr8enij	<d69ac402-dd6f-5ef9-d06f-d4221fa83409@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-07 13:34:23	2026-09-10 13:34:23	\N	2026-09-10 13:34:23	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:48.754	2026-09-09 11:03:04.221
cmtsgoebk003vy4g5ym4m5h68	171	cmtrr5oa8000020g5zpr8enij	<AS2PR08MB8454A30910A67F7B8FD79FEBF5DA2@AS2PR08MB8454.eurprd08.prod.outlook.com>	Mise a jour de la liste des sanctions financières ciblées des Nations Unies 13/08/2026	SC/16432 13 August 2026 Security Council ISIL (Da’esh) and Al-Qaida Sanctions Committee Amends Four Entries on Its Sanctions List On 13 August 2026, the Security Council Committee pursuant to resolutions 1267 (1999), 19…	\N	cmtsgodwv003uy4g5qsis4oi8	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-14 08:33:22	2026-09-09 11:19:41.547	\N	2026-08-18 08:33:22	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:42.944	2026-09-10 19:52:45.954
cmtsgo67d000ky4g5vu29ykrw	139	cmtrr5oa8000020g5zpr8enij	<AS8PR08MB794406673C2A52B6C7FF9B79A5F02@AS8PR08MB7944.eurprd08.prod.outlook.com>	RE: Transmission du rapport définitif de diagnostic  — comptes d'attente « 50 000 » et fonds en déshérence (réf. SAZ/001/04/2026)	Bonjour, Quelle est la suite de cette mission? Laya SIDIBE Directeur Général SanlamAllianz Cameroun Assurances Vie 34 Rue Dinde Bonanjo BP 267 Douala-Cameroun BP 105 Douala, Cameroun Cel: +237 6 59 11 56 81 [cid:b814da7…	\N	cmtsgo5uf000jy4g55nmywly0	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-06 17:59:57	2026-09-09 11:19:41.547	\N	2026-08-10 17:59:57	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:32.425	2026-09-09 11:19:43.51
cmtrremyx00077gg58sd1lvbc	122	cmtrr5oa8000020g5zpr8enij	<da3b181f-674d-7346-041d-b9f2e848a7db@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-03 08:22:13	2026-09-09 11:19:41.547	\N	2026-09-08 08:22:13	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:17.193	2026-09-09 11:19:43.625
cmtsgo56k000ay4g5a8doxgqa	136	cmtrr5oa8000020g5zpr8enij	<7e63c88c-d544-5c17-6924-6b58baf43478@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-05 14:53:56	2026-09-09 11:19:41.547	\N	2026-08-10 14:53:56	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:31.1	2026-09-09 11:19:43.659
cmtsgo5sm000gy4g5gnj7agvp	138	cmtrr5oa8000020g5zpr8enij	<22237531-ad0c-39c7-09c2-d82ac17ca5f3@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-06 16:47:05	2026-09-09 11:19:41.547	\N	2026-08-11 16:47:05	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:31.895	2026-09-09 11:19:43.671
cmtsgo43i0001y4g59imk5k28	133	cmtrr5oa8000020g5zpr8enij	<834f9837-67aa-71c9-a95c-debd0df66e31@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-04 23:01:42	2026-09-09 11:19:41.547	\N	2026-08-10 08:00:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:29.694	2026-09-09 11:19:43.833
cmtsgo4vh0007y4g5gd9j9x9j	135	cmtrr5oa8000020g5zpr8enij	<51a11872-79ad-c607-1ec2-52d13051f267@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-05 14:53:55	2026-09-09 11:19:41.547	\N	2026-08-10 14:53:55	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:30.701	2026-09-09 11:19:43.847
cmtsgo5i0000dy4g56et0z1vf	137	cmtrr5oa8000020g5zpr8enij	<a6ea522a-7552-2f99-d2f2-c1fddd243012@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-06 14:31:54	2026-09-09 11:19:41.547	\N	2026-08-11 14:31:54	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:31.512	2026-09-09 11:19:43.861
cmtsgo7u60015y4g5ricbvq34	144	cmtrr5oa8000020g5zpr8enij	<900426953.3488303.1786106120726.ref@mail.yahoo.com>	Questionnaire pour thèse.	A Messieurs et Mesdames. Objet : Questionnaire – Comprendre la transformation digitale de la Direction Générale des Impôts au Mali : Etude de l’impact des e. services fiscaux sur la perception du contrôle de la conformi…	\N	cmtsgo7kh0014y4g572l455xa	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-07 12:35:20	2026-09-09 11:19:41.547	\N	2026-08-11 12:35:20	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:34.542	2026-09-09 11:19:43.4
cmtsgo80n0019y4g50195ckf2	145	cmtrr5oa8000020g5zpr8enij	<lNul1M3NRQSzC87MEI43Tw@geopod-ismtpd-97>	Security alert: new Cowork remote device added to your Claude account		\N	cmtsgo7vl0018y4g586lgplp8	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-08 18:31:41	2026-09-09 11:19:41.547	\N	2026-08-12 08:00:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:34.776	2026-09-09 11:19:43.41
cmtsgo8tq001jy4g5e65cesvz	148	cmtrr5oa8000020g5zpr8enij	<KfvYq0SKS8GdcL_giGrLRA@geopod-ismtpd-65>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-10 14:34:28		\N	cmtsgo8oj001iy4g5metevttp	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-10 14:34:28	2026-09-09 11:19:41.547	\N	2026-08-12 14:34:28	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:35.822	2026-09-09 11:19:43.421
cmtsgo94n001ry4g5dew9pp80	150	cmtrr5oa8000020g5zpr8enij	<o8Ei4UAwR_G1f3e-KI71cA@geopod-ismtpd-69>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:44:14		\N	cmtsgo8ze001qy4g5b4oeouwo	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 10:44:14	2026-09-09 11:19:41.547	\N	2026-08-13 10:44:14	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:36.215	2026-09-09 11:19:43.431
cmtsgo9h8001zy4g5t5nhwimp	152	cmtrr5oa8000020g5zpr8enij	<kuJ8OJW3Tv-QFBq6CMGbow@geopod-ismtpd-105>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:54:49		\N	cmtsgo9bc001yy4g5czd19r9x	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 10:54:49	2026-09-09 11:19:41.547	\N	2026-08-13 10:54:49	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:36.668	2026-09-09 11:19:43.442
cmtsgo8yx001ny4g5r56lfciy	149	cmtrr5oa8000020g5zpr8enij	<45ydVcFmTtemY34tmg4xqQ@geopod-ismtpd-94>	Security alert: new trusted device added to your Claude account		\N	cmtsgo8u7001my4g5kmzvaaq7	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-10 14:35:16	2026-09-09 11:19:41.547	\N	2026-08-12 14:35:16	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:36.01	2026-09-09 11:19:43.519
cmtsgo9aj001vy4g5yoia1oxg	151	cmtrr5oa8000020g5zpr8enij	<VHn4EJ6LSU-3RXHMB-Ei1A@geopod-ismtpd-114>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:47:53		\N	cmtsgo95l001uy4g5s99bbs43	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 10:47:53	2026-09-09 11:19:41.547	\N	2026-08-13 10:47:53	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:36.427	2026-09-09 11:19:43.529
cmtsgoakd002cy4g56ysi0yfp	156	cmtrr5oa8000020g5zpr8enij	<41491757-372a-6ab1-87a8-b57570ef9c35@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-11 11:32:16	2026-09-09 11:19:41.547	\N	2026-08-14 11:32:16	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:38.077	2026-09-09 11:19:43.564
cmtsgo8ce001cy4g5wr4aw71m	146	cmtrr5oa8000020g5zpr8enij	<3a4d24ec-239f-fd71-d90e-713253e50c39@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-10 10:47:43	2026-09-09 11:19:41.547	\N	2026-08-13 10:47:43	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:35.199	2026-09-09 11:19:43.887
cmtsgo8nk001fy4g5y2djv750	147	cmtrr5oa8000020g5zpr8enij	<2f77c05c-e7ab-e567-ddcd-c81a1ef33bd6@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-10 10:48:04	2026-09-09 11:19:41.547	\N	2026-08-13 10:48:04	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:35.6	2026-09-09 11:19:43.901
cmtsgohs3004ty4g5meanvzxr	182	cmtrr5oa8000020g5zpr8enij	<TgPIfjVuSbOPfAauoBmbOg@geopod-ismtpd-60>	Votre lien sécurisé vers Claude.ai est ici | 2026-08-17 10:58:54		\N	cmtsgohn3004sy4g5nob3lbvs	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-17 10:58:54	2026-09-09 11:19:41.547	\N	2026-08-19 10:58:54	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:47.427	2026-09-09 11:19:43.452
cmtsgoime0055y4g5wo86qqpx	185	cmtrr5oa8000020g5zpr8enij	<MM0P280MB0152CACC452960A088AC80A6AEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>	RE: Rapport mensuel Juillet 2026 - ORPHEUS DREAM VILLAGE HOTEL	Bonjour merci Samaké, c est en effet, préoccupant , mais pas trop il faut juste déterminer à quoi est du le recul - baisse des entrées ? - maintient ou augmentation des investissements ? Bon courage De : sas@samko.group…	\N	cmtsgoicb0054y4g53ifpengz	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-18 18:56:40	2026-09-09 11:19:41.547	\N	2026-08-21 08:00:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:48.518	2026-09-09 11:19:43.462
cmtsgoen0003yy4g5wyanze9i	172	cmtrr5oa8000020g5zpr8enij	<72e16a5e-d728-0ecf-d6e5-4251aff25983@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-14 11:25:16	2026-09-09 11:19:41.547	\N	2026-08-19 11:25:16	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:43.356	2026-09-09 11:19:43.594
cmtsgoh17004jy4g57156xepl	179	cmtrr5oa8000020g5zpr8enij	<f47504b3-5912-50d8-1e60-826e763d4428@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-17 10:35:26	2026-09-09 11:19:41.547	\N	2026-08-20 10:35:26	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:46.459	2026-09-09 11:19:43.695
cmtsgohm5004py4g5tvc42ntd	181	cmtrr5oa8000020g5zpr8enij	<1cb9fc14-33e6-2463-c752-210db9215d1d@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-17 10:57:27	2026-09-09 11:19:41.547	\N	2026-08-20 10:57:27	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:47.213	2026-09-09 11:19:43.709
cmtsgoixy0058y4g5xrzh9w0f	186	cmtrr5oa8000020g5zpr8enij	<fd8c48f8-1073-bb8b-dfc9-253704afd235@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 10:48:12	2026-09-09 11:19:41.547	\N	2026-08-24 10:48:12	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:48.934	2026-09-09 11:19:43.721
cmtsgohc9004my4g57fmr5v9q	180	cmtrr5oa8000020g5zpr8enij	<595645e7-d296-e3ef-9dfa-82db42eebeba@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-17 10:35:26	2026-09-09 11:19:41.547	\N	2026-08-20 10:35:26	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:46.857	2026-09-09 11:19:43.914
cmtsgoibf0051y4g5b69jmta2	184	cmtrr5oa8000020g5zpr8enij	<18d658e9-cfbd-880b-45eb-772b8c15937d@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-18 18:00:59	2026-09-09 11:19:41.547	\N	2026-08-24 08:00:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:48.123	2026-09-09 11:19:43.928
cmtsgoj7i005by4g53nudad4y	187	cmtrr5oa8000020g5zpr8enij	<31e46f08-0259-b985-d793-2db93c6ff3bf@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 10:48:32	2026-09-09 11:19:41.547	\N	2026-08-24 10:48:32	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:49.278	2026-09-09 11:19:43.942
cmtsgo4kh0004y4g5x8cb73ha	134	cmtrr5oa8000020g5zpr8enij	<abf66c9a-f410-ac72-d7c7-e04662ed581c@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-05 14:50:56	2026-09-09 11:19:41.547	\N	2026-08-10 14:50:56	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:30.306	2026-09-09 11:19:43.649
cmtsgokbk005ny4g5fgf1dhz8	191	cmtrr5oa8000020g5zpr8enij	<6fe5ef5b-d7a9-67d6-c445-54df709177ba@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 10:50:33	2026-09-09 11:19:41.547	\N	2026-08-24 10:50:33	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:50.72	2026-09-09 11:19:43.745
cmtsgokvz005ty4g56ymkf1te	193	cmtrr5oa8000020g5zpr8enij	<ec8f2bc2-8911-a0d7-9ffe-4d5545f1c0f1@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 10:53:13	2026-09-09 11:19:41.547	\N	2026-08-24 10:53:13	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:51.455	2026-09-09 11:19:43.758
cmtsgolgs005zy4g5nchb02i5	195	cmtrr5oa8000020g5zpr8enij	<760f6d64-e588-bd52-c391-1206194243ea@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 11:30:53	2026-09-09 11:19:41.547	\N	2026-08-24 11:30:53	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:52.204	2026-09-09 11:19:43.771
cmtsgolzx0065y4g50uyrdnql	197	cmtrr5oa8000020g5zpr8enij	<bff12b5c-f6fc-5503-6b0f-dc074b784d04@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-21 10:52:41	2026-09-09 11:19:41.547	\N	2026-08-26 10:52:41	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:52.893	2026-09-09 11:19:43.786
cmtsgoklf005qy4g57pfwoe4i	192	cmtrr5oa8000020g5zpr8enij	<e58853bd-87e5-8a14-e1ad-a7bf3fb4c76b@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 10:52:53	2026-09-09 11:19:41.547	\N	2026-08-24 10:52:53	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:51.075	2026-09-09 11:19:43.96
cmtsgol74005wy4g50b3axzfw	194	cmtrr5oa8000020g5zpr8enij	<3d63c9bd-9adf-67c8-cb0b-e8f7635a4064@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 10:53:14	2026-09-09 11:19:41.547	\N	2026-08-24 10:53:14	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:51.856	2026-09-09 11:19:43.975
cmtsgolq50062y4g56iitl3w0	196	cmtrr5oa8000020g5zpr8enij	<98a59848-d19c-42df-fca3-bc23b0a05ebc@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 11:31:32	2026-09-09 11:19:41.547	\N	2026-08-24 11:31:32	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:52.541	2026-09-09 11:19:43.99
cmtsgomab0068y4g53n6axff9	198	cmtrr5oa8000020g5zpr8enij	<0093ec0a-e2ea-87e1-cec0-7991df5c79d7@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-21 11:07:32	2026-09-09 11:19:41.547	\N	2026-08-26 11:07:32	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:53.267	2026-09-09 11:19:44.004
cmtsgonxd006ry4g5o81xamd0	204	cmtrr5oa8000020g5zpr8enij	<MM0P280MB01529FE525923B79E3DD0DE3AEA32@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>	Re: T-MAK CORPORATION Rapport Mensuel d'Assistance Comptable Juillet 2026	Bonjour Soumailou, Je vous remercie pour l'envoi de ce rapport mensuel d'assistance comptable pour le mois de juillet 2026. Cependant, je suis étonné de constater la finalisation de ce document alors que le dispositif O…	\N	cmtsgonr3006qy4g5uzjl682k	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-21 20:33:27	2026-09-09 11:19:41.547	\N	2026-08-26 08:00:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:55.393	2026-09-09 11:19:43.552
cmtsgo7hy000zy4g50gkk03su	143	cmtrr5oa8000020g5zpr8enij	<d764544d-1b79-4177-875c-b20a25276e6f@proman.lu>	Re: 726_Validation de la TS-Emission de facture_Juin 2026_BRS_Projet FACEJ II	Bonjour, Merci pour la facture. Ma collègue Anastasiia de retour de congés prend le relais. Salutations. Mathieu Lefebvre Portfolio Manager Business Transformation and Risk Compliance Manager 34, rue du Moulin L-3857 Sc…	\N	cmtsgo77u000yy4g5rq302ek5	cmtqgt58z000i9gg5lw4xh259	NORMALE	EN_ATTENTE	cmtrb238z000804g5igkoyh1j	2026-08-07 12:02:57	2026-09-09 11:19:41.547	\N	2026-08-12 12:02:57	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:34.102	2026-09-09 11:19:43.683
cmtsgon5n006hy4g5jng7aybn	201	cmtrr5oa8000020g5zpr8enij	<4e8467f8-3e84-34ec-4eea-d210383be01e@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-21 11:41:55	2026-09-09 11:19:41.547	\N	2026-08-26 11:41:55	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:54.395	2026-09-09 11:19:44.018
cmtsgongf006ky4g5pn70rj2w	202	cmtrr5oa8000020g5zpr8enij	<220bf73a-8350-efd9-2458-e62e0daf2c73@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-21 11:42:24	2026-09-09 11:19:41.547	\N	2026-08-26 11:42:24	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:54.783	2026-09-09 11:19:44.033
cmtsgonqp006ny4g5rzwzii5w	203	cmtrr5oa8000020g5zpr8enij	<9b0213a5-b91c-7eeb-20b8-d666c4340e7b@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-21 14:29:57	2026-09-09 11:19:41.547	\N	2026-08-26 14:29:57	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:55.153	2026-09-09 11:19:44.051
cmtsgoo96006wy4g59j3m9a3u	205	cmtrr5oa8000020g5zpr8enij	<d73bef15-4f86-52b6-601e-997f6ee93ea6@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-24 08:36:39	2026-09-09 11:19:41.547	\N	2026-08-27 08:36:39	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:55.819	2026-09-09 11:19:44.064
cmtsgookg006zy4g526oxyyo4	206	cmtrr5oa8000020g5zpr8enij	<9fc26982-e723-44df-f198-974b00b6197c@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-24 08:36:59	2026-09-09 11:19:41.547	\N	2026-08-27 08:36:59	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:56.224	2026-09-09 11:19:44.078
cmtsgoow30072y4g54mwgg1wv	207	cmtrr5oa8000020g5zpr8enij	<4cc628b0-12f4-c35e-1598-e1d9cd327548@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-24 08:37:19	2026-09-09 11:19:41.547	\N	2026-08-27 08:37:19	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:56.643	2026-09-09 11:19:44.091
cmtsgok1z005ky4g5y1bwph9e	190	cmtrr5oa8000020g5zpr8enij	<c02eb3ee-4ac4-f82e-205a-0064298b88d7@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 10:50:33	2026-09-09 11:19:41.547	\N	2026-08-24 10:50:33	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:50.375	2026-09-09 11:19:43.733
cmtsgomul006ey4g5117dmr5k	200	cmtrr5oa8000020g5zpr8enij	<ea4d792d-cf5b-f2e5-5daf-0230c142930b@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-21 11:41:53	2026-09-09 11:19:41.547	\N	2026-08-26 11:41:53	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:53.997	2026-09-09 11:19:43.799
cmtsgops1007by4g5w90fho1y	210	cmtrr5oa8000020g5zpr8enij	<87fca958-5f43-65fe-5acc-4fadddd875b4@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-24 08:37:39	2026-09-09 11:19:41.547	\N	2026-08-27 08:37:39	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:57.793	2026-09-09 11:19:44.124
cmtsgoq9f007ey4g5kt1ub1wm	211	cmtrr5oa8000020g5zpr8enij	<ae38eabe-39d7-95b4-ecf2-7a91bc968bc3@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-27 12:10:18	2026-09-09 11:19:41.547	\N	2026-09-01 12:10:18	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:58.419	2026-09-09 11:19:44.137
cmtsgoqkj007hy4g55xpgfcot	212	cmtrr5oa8000020g5zpr8enij	<51f7b21f-7beb-76be-f482-ab2471aaa66c@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-27 12:10:18	2026-09-09 11:19:41.547	\N	2026-09-01 12:10:18	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:58.819	2026-09-09 11:19:44.15
cmtsgoqu7007ly4g5nlxu6s8w	213	cmtrr5oa8000020g5zpr8enij	<DBAP193MB1052790F1949AC8F2BBA7C0CA9AE2@DBAP193MB1052.EURP193.PROD.OUTLOOK.COM>	Re: FACTURE SAMKO AOUT 2026	J'accuse réception On Aug 26 2026, at 6:12 pm, dec@samko.group wrote: Bonjour, Veuillez trouver en pièce jointe la facture du mois d'août 2026 relative à l'assistance comptable et fiscale. Nous restons à votre dispositi…	\N	cmtsgoqks007ky4g5tgailvzu	cmtqgt58z000i9gg5lw4xh259	NORMALE	EN_ATTENTE	cmtrb238z000804g5igkoyh1j	2026-08-27 13:16:09	2026-09-09 11:19:41.547	\N	2026-09-01 13:16:09	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:59.167	2026-09-09 11:19:44.164
cmtsgorcs007sy4g5e4pwr6qo	215	cmtrr5oa8000020g5zpr8enij	<b45d45ce-7fcb-4d62-63d4-829ce7794c2f@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-02 10:14:18	2026-09-09 11:19:41.547	\N	2026-09-07 10:14:18	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:59.836	2026-09-09 11:19:44.176
cmtsgorp1007xy4g5w3b0mokg	216	cmtrr5oa8000020g5zpr8enij	<8883bac6-f671-89f5-a376-1701e9fc1e70@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-03 08:21:32	2026-09-09 11:19:41.547	\N	2026-09-08 08:21:32	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:23:00.277	2026-09-09 11:19:44.19
cmtsgocsb003by4g54pv0m36r	166	cmtrr5oa8000020g5zpr8enij	<R9cYTg3PT0S5q6Pc_nb0fg@geopod-ismtpd-52>	Security alert: new passkey added to your Claude account		\N	cmtsgocns003ay4g5snfghxa8	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	EN_ATTENTE	cmtrb2372000604g5852ipk4u	2026-08-11 12:46:30	2026-09-09 11:19:41.547	\N	2026-08-13 12:46:30	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:40.955	2026-09-09 11:19:43.491
cmtsgoi0v004xy4g5edx8sum0	183	cmtrr5oa8000020g5zpr8enij	<DB8PR01MB6011BC30BFA2C3B9EEAF042DE882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>	RE: CONSULTATION SYCEBNL - ETATS FINANCIER 2025 CARE CMR : Première réunion de cadrage	Hi Abdoul, Vu qu'il s'agit d'un paiement international, c'est notre siège qui y a procédé depuis le 17 juillet 2026 tel que le montre la copie du relevé partagé avec vous. Néanmoins, nous leur adressons un mail pour plu…	\N	cmtsgohss004wy4g5368a0ygu	cmtqgt58f000a9gg5l8lc9s0l	NORMALE	REPONDU	cmtrb2372000604g5852ipk4u	2026-08-17 15:10:05	2026-09-09 11:19:41.547	\N	\N	\N	0	2026-09-08 10:49:34	\N	\N	MAIL	\N	f	2026-09-18 08:00:00	\N	2026-09-08 09:22:47.744	2026-09-10 19:52:46.869
cmtsgo9xq0026y4g5n03aud9m	154	cmtrr5oa8000020g5zpr8enij	<626afd6d-9112-85e4-0d2f-42ee0cfd4a7f@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-11 11:12:36	2026-09-09 11:19:41.547	\N	2026-08-14 11:12:36	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:37.262	2026-09-09 11:19:44.107
cmtsgoc2p002ry4g54pc4cjw3	161	cmtrr5oa8000020g5zpr8enij	<0b0ed051-7425-2ad7-0e2f-24d8dd5c25d1@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-11 11:49:15	2026-09-09 11:19:41.547	\N	2026-08-14 11:49:15	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:40.033	2026-09-09 11:19:44.203
cmtsgo6js000py4g5a2i13st2	140	cmtrr5oa8000020g5zpr8enij	<fbfc5530-a07e-8594-ca7d-aff6f27566d8@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-07 09:45:35	2026-09-09 11:19:41.547	\N	2026-08-12 09:45:35	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:32.872	2026-09-09 11:19:44.216
cmtsgo76s000vy4g5ngcmixeb	142	cmtrr5oa8000020g5zpr8enij	<2c111362-bcee-56ce-23b4-470187c95173@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-07 09:46:35	2026-09-09 11:19:41.547	\N	2026-08-12 09:46:35	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:33.701	2026-09-09 11:19:44.229
cmtsgogo7004gy4g5widtu34d	178	cmtrr5oa8000020g5zpr8enij	<f86307e1-cdf7-c3fa-e878-7dd0637d4417@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-17 09:51:06	2026-09-09 11:19:41.547	\N	2026-08-20 09:51:06	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:45.991	2026-09-09 11:19:44.242
cmtsgopho0078y4g516epj1n5	209	cmtrr5oa8000020g5zpr8enij	<01666313-a789-d879-3f93-05c0a55775af@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-24 08:37:39	2026-09-09 11:19:41.547	\N	2026-08-27 08:37:39	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:57.42	2026-09-09 11:19:44.307
cmtsgojih005ey4g5bcsh395t	188	cmtrr5oa8000020g5zpr8enij	<220d524a-9930-2fdf-a2b5-69bc295d5c35@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 10:48:52	2026-09-09 11:19:41.547	\N	2026-08-24 10:48:52	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:49.673	2026-09-09 11:19:44.269
cmtsgomkf006by4g5kk5bp1xm	199	cmtrr5oa8000020g5zpr8enij	<29ca8ca0-0124-9893-73fb-65ae07634425@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-21 11:41:52	2026-09-09 11:19:41.547	\N	2026-08-26 11:41:52	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:53.631	2026-09-09 11:19:44.284
cmtrrekia00047gg58eak12v9	121	cmtrr5oa8000020g5zpr8enij	<db70094d-bbaf-1747-33be-6c35c43df2ab@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-03 08:21:52	2026-09-09 11:19:41.547	\N	2026-09-08 08:21:52	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:14.002	2026-09-09 11:19:44.319
cmtrrfdn400137gg55rf4lfit	132	cmtrr5oa8000020g5zpr8enij	<357589470913921.1788809550.061617612838745-openerp-11-res.users@eu736a.odoo.com>	Soumailou SAMAKE de ORPHEUS DREAM VILLAGE HOTEL vous invite à vous connecter à Odoo	Bienvenue sur Odoo DEC logo [6] Bonjour DEC, Vous avez été invité(e) par Soumailou SAMAKE de ORPHEUS DREAM VILLAGE HOTEL à vous connecter sur Odoo. Accepter l'invitation [1] * Ce lien restera valable pendant 6 jours * V…	\N	cmtrr7iqq003020g54zpx05fg	cmtqgt58q000e9gg50mg8f4oa	NORMALE	EN_ATTENTE	cmtrb239k000904g5zjr5hvz1	2026-09-07 19:32:30	2026-09-09 11:19:41.547	\N	2026-09-09 08:00:00	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:51.76	2026-09-09 11:19:44.331
cmtsgojss005hy4g543n81men	189	cmtrr5oa8000020g5zpr8enij	<95a88750-1a2e-7078-b5e5-3520b57a5b81@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-19 10:50:13	2026-09-09 11:19:41.547	\N	2026-08-24 10:50:13	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:50.044	2026-09-09 11:19:44.343
cmtsgop7m0075y4g5vvrpq4n7	208	cmtrr5oa8000020g5zpr8enij	<b9d45ec6-d6e8-7f06-f737-764675654470@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-08-24 08:37:19	2026-09-09 11:19:41.547	\N	2026-08-27 08:37:19	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-08 09:22:57.058	2026-09-09 11:19:44.354
cmtrrf8x8000w7gg5sncdibo2	130	cmtrr5oa8000020g5zpr8enij	<1b6dd2df-62ab-ba8c-1b6d-64659c34beee@dgi.gouv.ml>	E-Impôt- Avis de courriel	Vous avez reçu un nouveau message dans votre compte E-Impôt. Pour le lire, veuillez vous connecter à votre compte. Si vous avez des questions ou des préoccupations, veuillez contacter votre administration fiscale.	\N	cmtrr5ypd000120g5dkj6l1su	cmtqgt57h00039gg538o7p8fy	NORMALE	EN_ATTENTE	cmtrb238n000704g585q1vjii	2026-09-07 13:32:44	2026-09-10 13:32:44	\N	2026-09-10 13:32:44	\N	0	\N	\N	\N	\N	\N	f	\N	\N	2026-09-07 21:35:45.644	2026-09-09 11:03:06.158
cmtsgor2c007py4g5jawyc6x9	214	cmtrr5oa8000020g5zpr8enij	<AM0PR08MB396994BF29425BB229D8CF66C5A82@AM0PR08MB3969.eurprd08.prod.outlook.com>	726_Validation de la TS-Emission de facture_08/2026_BRS_Projet FACEJ II	Bonjour, J’espère que vous allez bien. Je tiens à vous informer que la Timesheet de l’expert Bréma SISSOKO pour le mois d’août a été validée. Le nombre total de jours prestés est de 21 jours. Vous pouvez à présent émett…	\N	cmtsgo7jd0012y4g5diuclqmn	cmtqgt58z000i9gg5lw4xh259	NORMALE	REPONDU	cmtrb238z000804g5igkoyh1j	2026-09-01 07:40:41	2026-09-09 11:19:41.547	\N	\N	\N	0	2026-09-10 11:19:35.248	\N	\N	TELEPHONE	\N	f	2026-09-17 11:19:35.279	\N	2026-09-08 09:22:59.46	2026-09-10 19:52:48.484
\.


--
-- Data for Name: evenement; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.evenement (id, type, acteur, utilisateur_id, echange_id, libelle, valeur_avant, valeur_apres, cree_le) FROM stdin;
cmtrrehi900027gg5deavaox1	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrehgl00017gg5c6lkpi6n	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:10.113
cmtrrekif00057gg5hj51fbyg	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrekia00047gg58eak12v9	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:14.007
cmtrremz100087gg5sxsw5a31	MAIL_ENREGISTRE	SYSTEME	\N	cmtrremyx00077gg58sd1lvbc	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:17.197
cmtrrep44000c7gg5cdlk8zde	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrep3w000b7gg5x9obo8vt	bsissoko@proman-project.com · RE: Demande d'accès Odoo pour un nouveau collaborateur	\N	\N	2026-09-07 21:35:19.972
cmtrrerrq000f7gg5lqe5akza	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrerri000e7gg5kcbczxkv	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:23.414
cmtrrev4d000i7gg5kpe3lrhx	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrev41000h7gg5pz5mbfwy	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:27.757
cmtrrexz0000l7gg5hbiegub8	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrexyq000k7gg5fion4por	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:31.452
cmtrrf0i1000o7gg5jhkfl0wi	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrf0hv000n7gg5wju6b06i	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:34.729
cmtrrf3i1000r7gg5ifohx7gx	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrf3ht000q7gg5rgb7h7im	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:38.617
cmtrrf6ku000u7gg5ccwh9409	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrf6kk000t7gg5u55w0fxz	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:42.606
cmtrrf8xf000x7gg55v8wha57	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrf8x8000w7gg5sncdibo2	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:45.651
cmtrrfbbq00107gg537zibzce	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrfbbm000z7gg5btt0mkpo	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-07 21:35:48.758
cmtrrfdna00147gg5cv30hm7v	MAIL_ENREGISTRE	SYSTEME	\N	cmtrrfdn400137gg55rf4lfit	catchall@orpheus.odoo.com · Soumailou SAMAKE de ORPHEUS DREAM VILLAGE HOTEL vous invite à vous connecter à Odoo	\N	\N	2026-09-07 21:35:51.766
cmtsgo4900002y4g5jh44dmho	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo43i0001y4g59imk5k28	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:29.893
cmtrb24d0002704g560b6yjjh	REPONSE_DETECTEE	SYSTEME	\N	cmtrb2418001f04g52d1kf34g	Re: Confirmation de commande, pièces d'usure concasseur	\N	\N	2026-09-07 06:24:00
cmtrb24da002804g5ja8bimlf	RELANCE_ENVOYEE	SYSTEME	\N	cmtrb23hw000l04g57uj226l1	Relance 2 · Mainlevée conteneur MSKU 4471	\N	\N	2026-09-06 10:24:00
cmtrb24dm002904g5s380nldm	MAIL_ATTRIBUE	UTILISATEUR	cmtrb2372000604g5852ipk4u	cmtrb23v9001104g5ixlv9erv	Programme de livraison gasoil attribué à Fatoumata Diallo	\N	\N	2026-09-06 15:24:00
cmtrb24dr002a04g5vyz0ka2t	REPONSE_DETECTEE	SYSTEME	\N	cmtrb2423001i04g5h7rkp7fo	Re: Attestation de régularité fiscale	\N	\N	2026-09-06 08:24:00
cmtrb24e1002b04g5ybjwagkp	MAIL_ARCHIVE	SYSTEME	\N	cmtrb2440001q04g5rlflow4w	Procès-verbal de réception, station de pompage	\N	\N	2026-08-17 10:24:00
cmtrb24el002c04g57at7a9lr	MAIL_QUALIFIE	UTILISATEUR	cmtrb238z000804g5igkoyh1j	cmtrb23sb000t04g5d4up9gy7	Régularisation déclaration en détail · catégorie Date butoir	\N	\N	2026-09-03 10:24:00
cmtrb2cag0002xsg5upzw6r70	RELANCE_ENVOYEE	SYSTEME	\N	cmtrb23hw000l04g57uj226l1	Relance 3	\N	\N	2026-09-07 13:57:49.625
cmtrb2cdd0005xsg580lo30k9	RELANCE_ENVOYEE	SYSTEME	\N	cmtrb23sb000t04g5d4up9gy7	Relance 2	\N	\N	2026-09-07 13:57:49.729
cmtsgo4kq0005y4g5p1rjixvw	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo4kh0004y4g5x8cb73ha	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:30.314
cmtsgo4vr0008y4g5aejs3c22	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo4vh0007y4g5gd9j9x9j	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:30.711
cmtsgo56s000by4g5k7jgjle3	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo56k000ay4g5a8doxgqa	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:31.108
cmtsgo5ij000ey4g56ngpxg2p	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo5i0000dy4g56et0z1vf	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:31.531
cmtsgo5sx000hy4g5t0uwg4rk	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo5sm000gy4g5gnj7agvp	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:31.905
cmtsgo67k000ly4g5r5woku6b	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo67d000ky4g5vu29ykrw	laya.sidibe@cm.sanlamallianz.com · RE: Transmission du rapport définitif de diagnostic  — comptes d'attente « 50 000 » et fonds en désh	\N	\N	2026-09-08 09:22:32.432
cmtsgo6kg000qy4g5qhb487qm	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo6js000py4g5a2i13st2	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:32.896
cmtsgo6vd000ty4g5tuhrymea	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo6v3000sy4g54o1w189t	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:33.289
cmtsgo771000wy4g5pghcaw7r	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo76s000vy4g5ngcmixeb	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:33.709
cmtsgo7i80010y4g5bf82c38b	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo7hy000zy4g50gkk03su	mlefebvre@proman.lu · Re: 726_Validation de la TS-Emission de facture_Juin 2026_BRS_Projet FACEJ II	\N	\N	2026-09-08 09:22:34.112
cmtsgo7uh0016y4g5fx1ao2w1	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo7u60015y4g5ricbvq34	drame1fr@yahoo.fr · Questionnaire pour thèse.	\N	\N	2026-09-08 09:22:34.553
cmtsgo80v001ay4g5zympisod	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo80n0019y4g50195ckf2	no-reply-y0djikh8n06qjjpglijk0w@mail.anthropic.com · Security alert: new Cowork remote device added to your Claude account	\N	\N	2026-09-08 09:22:34.783
cmtsgo8co001dy4g5a9soilzj	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo8ce001cy4g5wr4aw71m	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:35.208
cmtsgo8ns001gy4g57u4u9rdr	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo8nk001fy4g5y2djv750	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:35.608
cmtsgo8tu001ky4g5xt9it9aj	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo8tq001jy4g5e65cesvz	no-reply-isbedpgpjng55ckepm0hew@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-10 14:34:28	\N	\N	2026-09-08 09:22:35.826
cmtsgo8z1001oy4g5b96vsqeq	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo8yx001ny4g5r56lfciy	no-reply-zdhqduunggzlgjytjvmeja@mail.anthropic.com · Security alert: new trusted device added to your Claude account	\N	\N	2026-09-08 09:22:36.013
cmtsgo94u001sy4g5t6k9zbqc	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo94n001ry4g5dew9pp80	no-reply-st6rblwi-u_nwgkp75r-rq@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:44:14	\N	\N	2026-09-08 09:22:36.222
cmtsgo9ap001wy4g5kdb027xq	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo9aj001vy4g5yoia1oxg	no-reply-qisj46tjfk7splttmwglka@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:47:53	\N	\N	2026-09-08 09:22:36.433
cmtsgo9hf0020y4g5412di6lh	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo9h8001zy4g5t5nhwimp	no-reply-qt1ru8tt20qgbty1rrfqhg@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:54:49	\N	\N	2026-09-08 09:22:36.675
cmtsgo9nm0024y4g58wlwnrf0	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo9nf0023y4g5ox3bvpeg	no-reply-po9rztvfp90ulor5h7h2tw@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:55:50	\N	\N	2026-09-08 09:22:36.899
cmtsgo9y00027y4g5jrhictxe	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgo9xq0026y4g5n03aud9m	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:37.272
cmtsgoa97002ay4g5ltphyh2r	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoa8z0029y4g53l3ery6y	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:37.675
cmtsgoakk002dy4g5cu1pr2dm	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoakd002cy4g56ysi0yfp	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:38.084
cmtsgoavb002gy4g51l4zou3p	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoav2002fy4g5otcyvmwt	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:38.471
cmtsgob5y002jy4g52182iy7n	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgob5v002iy4g5xd5u2h8a	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:38.854
cmtsgobgj002my4g54lscwyan	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgobga002ly4g5rk9g0koh	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:39.235
cmtsgobrw002py4g5wukejtfm	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgobrr002oy4g5nhzegcu1	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:39.644
cmtsgoc2u002sy4g5eg9uf0rh	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoc2p002ry4g54pc4cjw3	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:40.038
cmtsgoc83002wy4g5cey2uj04	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoc80002vy4g5sebz4w09	no-reply-rf_vxfiuf4lhjvrtxogvrw@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 12:37:13	\N	\N	2026-09-08 09:22:40.227
cmtsgocdc0030y4g5ytd7duln	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgocd9002zy4g5sadj4hh5	no-reply-nzvw0xa_iv8o9b3b12lv-a@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 12:37:20	\N	\N	2026-09-08 09:22:40.416
cmtsgocim0034y4g5gyufotcm	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgocij0033y4g5nz5cvmya	no-reply-brfo5imx69igrofh4ugnua@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 12:45:27	\N	\N	2026-09-08 09:22:40.606
cmtsgocng0038y4g5xj7rvbsm	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgocne0037y4g5jie9rcwi	no-reply-8t3reknssffaltjwfadftq@mail.anthropic.com · Security alert: new trusted device added to your Claude account	\N	\N	2026-09-08 09:22:40.78
cmtsgocsf003cy4g59lijoudk	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgocsb003by4g54pv0m36r	no-reply-gitqovv6evfzjal-fhzira@mail.anthropic.com · Security alert: new passkey added to your Claude account	\N	\N	2026-09-08 09:22:40.959
cmtsgod1s003gy4g51tpcwoqh	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgod1p003fy4g5l8pb2dxb	no-reply-ycu-afsefjgc91-1txopkq@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 14:57:18	\N	\N	2026-09-08 09:22:41.296
cmtsgoda4003ky4g5sunjmx15	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgod9y003jy4g5qkwtv9q8	no-reply-j6ondfhmonnllkmultma_q@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 21:42:45	\N	\N	2026-09-08 09:22:41.596
cmtsgodkv003oy4g5ohgtt0h9	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgodks003ny4g57hptcv1r	no-reply-gzbanido1_zx-vripj6otq@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-12 17:29:35	\N	\N	2026-09-08 09:22:41.983
cmtsgodwh003sy4g5hgexksnj	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgodwd003ry4g50ov00o56	bober@odoo.com · RE: Votre Gestionnaire de Compte Odoo	\N	\N	2026-09-08 09:22:42.402
cmtsgoebt003wy4g5v3i73pp7	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoebk003vy4g5ym4m5h68	courrier.sgccga@finances.ml · Mise a jour de la liste des sanctions financières ciblées des Nations Unies 13/08/2026	\N	\N	2026-09-08 09:22:42.953
cmtsgoen4003zy4g5oey1fugw	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoen0003yy4g5wyanze9i	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:43.36
cmtsgoex30042y4g5z1tx8ysx	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoewx0041y4g57zq8vadx	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:43.719
cmtsgof6a0045y4g58kzw0y7g	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgof5x0044y4g5cpswnx1h	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:44.05
cmtsgofgv0048y4g5eas3k1vv	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgofgo0047y4g5szcewaov	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:44.431
cmtsgofua004by4g5f561oytk	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgofu5004ay4g5hdd3rvxy	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:44.914
cmtsgogaa004ey4g5oadw7osm	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoga6004dy4g5m91sslcc	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:45.49
cmtsgogod004hy4g58ci5ssuc	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgogo7004gy4g5widtu34d	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:45.997
cmtsgoh1f004ky4g5ygaoid5w	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoh17004jy4g57156xepl	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:46.467
cmtsgohcd004ny4g5lh1rwlg0	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgohc9004my4g57fmr5v9q	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:46.862
cmtsgohmd004qy4g5rtex3dkd	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgohm5004py4g5tvc42ntd	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:47.222
cmtsgohs8004uy4g5p4dqgioj	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgohs3004ty4g5meanvzxr	no-reply-zl5_py4yj8i8e_vzzb6elw@mail.anthropic.com · Votre lien sécurisé vers Claude.ai est ici | 2026-08-17 10:58:54	\N	\N	2026-09-08 09:22:47.432
cmtsgoi12004yy4g5jtqkwjqf	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoi0v004xy4g5edx8sum0	ghislaineflore.tchoudjem@care.org · RE: CONSULTATION SYCEBNL - ETATS FINANCIER 2025 CARE CMR : Première réunion de cadrage	\N	\N	2026-09-08 09:22:47.75
cmtsgoi1v0050y4g5xpkfnyyk	ANOMALIE_TECHNIQUE	SYSTEME	\N	\N	Rapport de non-remise reçu : Undelivered Mail Returned to Sender	\N	\N	2026-09-08 09:22:47.779
cmtsgoibp0052y4g5ivz17zf8	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoibf0051y4g5b69jmta2	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:48.133
cmtsgoiml0056y4g5qgft8cak	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoime0055y4g5wo86qqpx	bekaye.b.samake@orpheusdreamvillage.com · RE: Rapport mensuel Juillet 2026 - ORPHEUS DREAM VILLAGE HOTEL	\N	\N	2026-09-08 09:22:48.525
cmtsgoiy40059y4g5e97m8m58	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoixy0058y4g5xrzh9w0f	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:48.94
cmtsgoj7r005cy4g5h7gqeu25	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoj7i005by4g53nudad4y	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:49.287
cmtsgojit005fy4g5up7spf6m	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgojih005ey4g5bcsh395t	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:49.685
cmtsgojsv005iy4g5a8n44hu5	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgojss005hy4g543n81men	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:50.047
cmtsgok23005ly4g51fun7923	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgok1z005ky4g5y1bwph9e	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:50.379
cmtsgokbs005oy4g5vooaf57l	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgokbk005ny4g5fgf1dhz8	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:50.728
cmtsgoklr005ry4g58hkh7c3q	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoklf005qy4g57pfwoe4i	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:51.087
cmtsgokw5005uy4g5c5tfwd5s	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgokvz005ty4g56ymkf1te	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:51.461
cmtsgol77005xy4g5dksdeqig	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgol74005wy4g50b3axzfw	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:51.859
cmtsgolgv0060y4g5xrhrilwm	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgolgs005zy4g5nchb02i5	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:52.207
cmtsgolqb0063y4g5g3ummbcb	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgolq50062y4g56iitl3w0	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:52.547
cmtsgom010066y4g571ndpm15	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgolzx0065y4g50uyrdnql	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:52.897
cmtsgomaf0069y4g5n2uvadyk	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgomab0068y4g53n6axff9	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:53.271
cmtsgomkl006cy4g530ojf17e	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgomkf006by4g5kk5bp1xm	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:53.637
cmtsgomur006fy4g56aarrrcm	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgomul006ey4g5117dmr5k	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:54.003
cmtsgon5x006iy4g5b1n5pvjo	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgon5n006hy4g5jng7aybn	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:54.405
cmtsgongk006ly4g5xrhgruvo	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgongf006ky4g5pn70rj2w	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:54.788
cmtsgonqs006oy4g5gqyti3ie	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgonqp006ny4g5rzwzii5w	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:55.156
cmtsgonxh006sy4g5o82nuauu	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgonxd006ry4g5o81xamd0	n.traore@t-mak.org · Re: T-MAK CORPORATION Rapport Mensuel d'Assistance Comptable Juillet 2026	\N	\N	2026-09-08 09:22:55.397
cmtsgoo9e006xy4g50gyu1qbj	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoo96006wy4g59j3m9a3u	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:55.826
cmtsgookt0070y4g5wkulum8x	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgookg006zy4g526oxyyo4	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:56.237
cmtsgoowe0073y4g53ntz14ss	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoow30072y4g54mwgg1wv	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:56.654
cmtsgop7t0076y4g5n2kcs95n	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgop7m0075y4g5vvrpq4n7	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:57.065
cmtsgophs0079y4g5af4dk1k3	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgopho0078y4g516epj1n5	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:57.424
cmtsgops8007cy4g5g1ostwcy	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgops1007by4g5w90fho1y	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:57.8
cmtsgoq9n007fy4g5wbg3kenh	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoq9f007ey4g5kt1ub1wm	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:58.427
cmtsgoqkm007iy4g541sh2oul	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoqkj007hy4g55xpgfcot	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:58.822
cmtsgoqud007my4g5g9x0fyyi	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgoqu7007ly4g5nlxu6s8w	bureau@dc-max.tech · Re: FACTURE SAMKO AOUT 2026	\N	\N	2026-09-08 09:22:59.173
cmtsgor2j007qy4g5vroocs62	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgor2c007py4g5jawyc6x9	akobasky@proman.lu · 726_Validation de la TS-Emission de facture_08/2026_BRS_Projet FACEJ II	\N	\N	2026-09-08 09:22:59.468
cmtsgord2007ty4g5t3no59q4	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgorcs007sy4g5e4pwr6qo	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:22:59.846
cmtsgorp9007yy4g5bvg123oj	MAIL_ENREGISTRE	SYSTEME	\N	cmtsgorp1007xy4g5w3b0mokg	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-08 09:23:00.286
cmtsgsgsn0000yog5gwbzfuo1	ANOMALIE_TECHNIQUE	SYSTEME	\N	\N	Rapport de non-remise reçu : Undelivered Mail Returned to Sender	\N	\N	2026-09-08 09:25:52.776
cmtsgvzpn0007xog5q872y5r2	RELANCE_ENVOYEE	SYSTEME	\N	\N	Relance 1	\N	\N	2026-09-08 09:28:37.26
cmtshdynm00084og5ckozjykc	RELANCE_ENVOYEE	SYSTEME	\N	\N	Relance 1	\N	\N	2026-09-08 09:42:35.698
cmtshzmvb0007ucg5nnr1bi3n	RELANCE_ENVOYEE	SYSTEME	\N	\N	Relance 1	\N	\N	2026-09-08 09:59:26.855
cmtsm6bvg000114g5d0qcikie	MAIL_QUALIFIE	SYSTEME	\N	cmtrb23zd001904g59cyl5atc	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:56:37.66
cmtsm6bwa000214g5pbrqsga1	MAIL_ATTRIBUE	SYSTEME	\N	cmtrb23zd001904g59cyl5atc	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:56:37.69
cmtsm6bxr000414g5sjkgl0qr	MAIL_QUALIFIE	SYSTEME	\N	cmtrb2400001b04g52crh2evj	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:56:37.743
cmtsm6bxy000514g5hu4qt3or	MAIL_ATTRIBUE	SYSTEME	\N	cmtrb2400001b04g52crh2evj	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:56:37.75
cmtsm6bz0000714g5l5xrud4j	MAIL_QUALIFIE	SYSTEME	\N	cmtrb240h001d04g5aua0ffc7	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:56:37.788
cmtsm6bz2000814g573hcr7t9	MAIL_ATTRIBUE	SYSTEME	\N	cmtrb240h001d04g5aua0ffc7	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:56:37.791
cmtsm6wit0001qsg5se1f0bge	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo9nf0023y4g5ox3bvpeg	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.421
cmtsm6wj00002qsg5atgplbkq	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo9nf0023y4g5ox3bvpeg	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.428
cmtsm6wkg0004qsg58xe0wkif	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo9xq0026y4g5n03aud9m	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.48
cmtsm6wkm0005qsg52lro1ydg	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo9xq0026y4g5n03aud9m	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.486
cmtsm6wle0007qsg5ai17xvfn	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoa8z0029y4g53l3ery6y	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.514
cmtsm6wlh0008qsg5b867gjxc	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoa8z0029y4g53l3ery6y	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.517
cmtsm6wm2000aqsg5iamtw50z	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoakd002cy4g56ysi0yfp	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.538
cmtsm6wm4000bqsg5mju9vyyc	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoakd002cy4g56ysi0yfp	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.54
cmtsm6wms000dqsg5asrahgzi	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoav2002fy4g5otcyvmwt	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.564
cmtsm6wmu000eqsg5oxs21kud	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoav2002fy4g5otcyvmwt	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.566
cmtsm6wne000gqsg5cyxxl7te	MAIL_QUALIFIE	SYSTEME	\N	cmtsgob5v002iy4g5xd5u2h8a	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.586
cmtsm6wng000hqsg5mycjverj	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgob5v002iy4g5xd5u2h8a	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.588
cmtsm6wo7000jqsg5g2ijyoeo	MAIL_QUALIFIE	SYSTEME	\N	cmtsgobga002ly4g5rk9g0koh	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.615
cmtsm6woa000kqsg5wvyhw2st	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgobga002ly4g5rk9g0koh	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.618
cmtsm6wou000mqsg5ukv2nq54	MAIL_QUALIFIE	SYSTEME	\N	cmtsgobrr002oy4g5nhzegcu1	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.638
cmtsm6wow000nqsg5zgfbygty	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgobrr002oy4g5nhzegcu1	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.64
cmtsm6wph000pqsg59zvufvyx	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoc2p002ry4g54pc4cjw3	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.661
cmtsm6wpl000qqsg5rv8055iv	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoc2p002ry4g54pc4cjw3	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.665
cmtsm6wqv000vqsg5unlnn9cy	MAIL_QUALIFIE	SYSTEME	\N	cmtsgocd9002zy4g5sadj4hh5	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.711
cmtsm6wr0000wqsg50snmbwep	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgocd9002zy4g5sadj4hh5	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.716
cmtsm6wsd0011qsg5ueb9bg3z	MAIL_QUALIFIE	SYSTEME	\N	cmtsgocne0037y4g5jie9rcwi	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.765
cmtsm6wsf0012qsg5eh0qths9	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgocne0037y4g5jie9rcwi	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.767
cmtsm6wsy0014qsg5pdsylvz1	MAIL_QUALIFIE	SYSTEME	\N	cmtsgocsb003by4g54pv0m36r	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.786
cmtsm6wsz0015qsg56x54tahv	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgocsb003by4g54pv0m36r	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.787
cmtsm6wu4001aqsg5gttyqd05	MAIL_QUALIFIE	SYSTEME	\N	cmtsgod9y003jy4g5qkwtv9q8	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.828
cmtsm6wu7001bqsg501r2av1t	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgod9y003jy4g5qkwtv9q8	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.831
cmtsm6wv6001gqsg5xw8e5yva	MAIL_QUALIFIE	SYSTEME	\N	cmtsgodwd003ry4g50ov00o56	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.866
cmtsm6wv8001hqsg5i6xwjau2	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgodwd003ry4g50ov00o56	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.868
cmtsm6wwv001mqsg5rot0nh2z	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoen0003yy4g5wyanze9i	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.927
cmtsm6wwz001nqsg5ovapvze7	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoen0003yy4g5wyanze9i	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.931
cmtsm6wy3001sqsg5e7ntknm8	MAIL_QUALIFIE	SYSTEME	\N	cmtsgof5x0044y4g5cpswnx1h	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.971
cmtsm6wy5001tqsg5p4mfjy0g	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgof5x0044y4g5cpswnx1h	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.973
cmtsm6x060021qsg5jk5gavut	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoga6004dy4g5m91sslcc	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.046
cmtsm6x090022qsg57u208mmo	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoga6004dy4g5m91sslcc	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.049
cmtsm6x23002aqsg58aogxsst	MAIL_QUALIFIE	SYSTEME	\N	cmtrremyx00077gg58sd1lvbc	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.115
cmtsm6x25002bqsg5iovi2su8	MAIL_ATTRIBUE	SYSTEME	\N	cmtrremyx00077gg58sd1lvbc	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.117
cmtsm6x35002gqsg56r10m57m	MAIL_QUALIFIE	SYSTEME	\N	cmtrrerri000e7gg5kcbczxkv	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.153
cmtsm6x37002hqsg5y1tbcfv6	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrerri000e7gg5kcbczxkv	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.155
cmtsm6x4b002mqsg5fxccsd3c	MAIL_QUALIFIE	SYSTEME	\N	cmtrrexyq000k7gg5fion4por	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.195
cmtsm6x4f002nqsg549lloq9s	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrexyq000k7gg5fion4por	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.199
cmtsm6x5i002sqsg5v9v88295	MAIL_QUALIFIE	SYSTEME	\N	cmtrrf3ht000q7gg5rgb7h7im	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.238
cmtsm6x5k002tqsg5is0ae9np	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrf3ht000q7gg5rgb7h7im	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.24
cmtsm6x7d0031qsg5p7q0vswm	MAIL_QUALIFIE	SYSTEME	\N	cmtrrfbbm000z7gg5btt0mkpo	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.305
cmtsm6x7f0032qsg5j8xds2i8	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrfbbm000z7gg5btt0mkpo	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.307
cmtsm6x8v0037qsg5jop9af0q	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo43i0001y4g59imk5k28	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.359
cmtsm6x8z0038qsg5x98s7av1	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo43i0001y4g59imk5k28	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.363
cmtsm6xa4003dqsg5bshjnxl1	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo4vh0007y4g5gd9j9x9j	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.404
cmtsm6xa7003eqsg5vm7ew1ro	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo4vh0007y4g5gd9j9x9j	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.407
cmtsm6xc7003mqsg5r53p8gyv	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo5sm000gy4g5gnj7agvp	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.479
cmtsm6xca003nqsg5cnnejdyv	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo5sm000gy4g5gnj7agvp	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.482
cmtsm6xcx003pqsg5bl0w0tr2	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo67d000ky4g5vu29ykrw	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.506
cmtsm6xd0003qqsg52xli3vsj	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo67d000ky4g5vu29ykrw	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.508
cmtsm6xdt003sqsg5jj7l9g7u	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo6js000py4g5a2i13st2	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.537
cmtsm6xdw003tqsg5nehdeay4	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo6js000py4g5a2i13st2	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.54
cmtsm6xer003vqsg5yg0q4cen	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo6v3000sy4g54o1w189t	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.571
cmtsm6xet003wqsg5i12odehm	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo6v3000sy4g54o1w189t	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.573
cmtsm6xfd003yqsg5vxoa80r7	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo76s000vy4g5ngcmixeb	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.593
cmtsm6xfg003zqsg5dpmetfnz	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo76s000vy4g5ngcmixeb	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.596
cmtsm6xfw0041qsg5qhswqctr	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo7hy000zy4g50gkk03su	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.612
cmtsm6xfz0042qsg5517szn2u	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo7hy000zy4g50gkk03su	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.615
cmtsm6xhm004aqsg5ha009jio	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo8ce001cy4g5wr4aw71m	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.674
cmtsm6xho004bqsg5sk0l79gl	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo8ce001cy4g5wr4aw71m	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.676
cmtsm6xja004jqsg59tf18gub	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo8yx001ny4g5r56lfciy	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.734
cmtsm6xjc004kqsg554fbwbbq	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo8yx001ny4g5r56lfciy	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.736
cmtsm6xkb004pqsg52dfnb1xu	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo9aj001vy4g5yoia1oxg	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.771
cmtsm6xkd004qqsg55igmnxkz	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo9aj001vy4g5yoia1oxg	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.773
cmtsm6xl9004vqsg5jrbkj9im	MAIL_QUALIFIE	SYSTEME	\N	cmtsgogo7004gy4g5widtu34d	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.805
cmtsm6xla004wqsg5ig54bid1	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgogo7004gy4g5widtu34d	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.806
cmtsm6xmt0054qsg5p7xdgjot	MAIL_QUALIFIE	SYSTEME	\N	cmtsgohm5004py4g5tvc42ntd	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.861
cmtsm6xmv0055qsg5urkyqwcu	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgohm5004py4g5tvc42ntd	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.863
cmtsm6xo1005aqsg5ikxf4chk	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoi0v004xy4g5edx8sum0	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.905
cmtsm6xo3005bqsg5ceghr486	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoi0v004xy4g5edx8sum0	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.907
cmtsm6wq4000sqsg56wc33y4k	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoc80002vy4g5sebz4w09	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.684
cmtsm6wq7000tqsg51evc0bqs	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoc80002vy4g5sebz4w09	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.687
cmtsm6wrs000yqsg5k8h7s51u	MAIL_QUALIFIE	SYSTEME	\N	cmtsgocij0033y4g5nz5cvmya	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.744
cmtsm6wru000zqsg5ufy6rss2	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgocij0033y4g5nz5cvmya	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.746
cmtsm6wtl0017qsg5jaylj6xp	MAIL_QUALIFIE	SYSTEME	\N	cmtsgod1p003fy4g5l8pb2dxb	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.809
cmtsm6wto0018qsg5gmhsfcal	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgod1p003fy4g5l8pb2dxb	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.812
cmtsm6wum001dqsg596kzlv3y	MAIL_QUALIFIE	SYSTEME	\N	cmtsgodks003ny4g57hptcv1r	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.846
cmtsm6wuo001eqsg5jp5j0a9p	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgodks003ny4g57hptcv1r	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.848
cmtsm6wvr001jqsg54dgt1xml	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoebk003vy4g5ym4m5h68	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.887
cmtsm6wvt001kqsg5zka5kv1o	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoebk003vy4g5ym4m5h68	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.889
cmtsm6wxk001pqsg5m44t1ixx	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoewx0041y4g57zq8vadx	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.952
cmtsm6wxn001qqsg5yeyvi80p	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoewx0041y4g57zq8vadx	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.955
cmtsm6wyn001vqsg5unf7axjc	MAIL_QUALIFIE	SYSTEME	\N	cmtsgofgo0047y4g5szcewaov	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:04.991
cmtsm6wyo001wqsg5kg2mmpzk	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgofgo0047y4g5szcewaov	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:04.992
cmtsm6wz6001yqsg56dl4ydhv	MAIL_QUALIFIE	SYSTEME	\N	cmtsgofu5004ay4g5hdd3rvxy	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.01
cmtsm6wz8001zqsg5rzi0q0d8	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgofu5004ay4g5hdd3rvxy	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.012
cmtsm6x0v0024qsg5qwomlya0	MAIL_QUALIFIE	SYSTEME	\N	cmtrrehgl00017gg5c6lkpi6n	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.071
cmtsm6x0w0025qsg5n2fyjsx4	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrehgl00017gg5c6lkpi6n	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.072
cmtsm6x1e0027qsg5uwr27f8o	MAIL_QUALIFIE	SYSTEME	\N	cmtrrekia00047gg58eak12v9	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.09
cmtsm6x1g0028qsg5nzigpsnc	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrekia00047gg58eak12v9	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.092
cmtsm6x2l002dqsg5uw9inkuo	MAIL_QUALIFIE	SYSTEME	\N	cmtrrep3w000b7gg5x9obo8vt	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.133
cmtsm6x2o002eqsg5ol3ca4qu	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrep3w000b7gg5x9obo8vt	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.136
cmtsm6x3s002jqsg5ylgllhn3	MAIL_QUALIFIE	SYSTEME	\N	cmtrrev41000h7gg5pz5mbfwy	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.176
cmtsm6x3u002kqsg5u2tiposi	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrev41000h7gg5pz5mbfwy	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.178
cmtsm6x4y002pqsg5yneon90i	MAIL_QUALIFIE	SYSTEME	\N	cmtrrf0hv000n7gg5wju6b06i	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.218
cmtsm6x50002qqsg5xixh6tv9	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrf0hv000n7gg5wju6b06i	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.22
cmtsm6x65002vqsg5nupb8ok2	MAIL_QUALIFIE	SYSTEME	\N	cmtrrf6kk000t7gg5u55w0fxz	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.261
cmtsm6x69002wqsg5i29ms6ti	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrf6kk000t7gg5u55w0fxz	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.265
cmtsm6x6u002yqsg5vgas4xrz	MAIL_QUALIFIE	SYSTEME	\N	cmtrrf8x8000w7gg5sncdibo2	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.286
cmtsm6x6w002zqsg5s2i9qq06	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrf8x8000w7gg5sncdibo2	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.288
cmtsm6x800034qsg5dlgos4jo	MAIL_QUALIFIE	SYSTEME	\N	cmtrrfdn400137gg55rf4lfit	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.328
cmtsm6x830035qsg57q3ihmjf	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrfdn400137gg55rf4lfit	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.331
cmtsm6x9k003aqsg5dzatgh1t	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo4kh0004y4g5x8cb73ha	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.384
cmtsm6x9m003bqsg5cykdemgs	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo4kh0004y4g5x8cb73ha	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.386
cmtsm6xat003gqsg58yt82s9r	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo56k000ay4g5a8doxgqa	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.43
cmtsm6xaw003hqsg5n3tlfhfw	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo56k000ay4g5a8doxgqa	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.432
cmtsm6xbh003jqsg5fvxup090	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo5i0000dy4g56et0z1vf	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.453
cmtsm6xbj003kqsg5pn55yojn	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo5i0000dy4g56et0z1vf	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.455
cmtsm6xgh0044qsg5ds4pxsak	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo7u60015y4g5ricbvq34	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.633
cmtsm6xgj0045qsg5nmnocn70	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo7u60015y4g5ricbvq34	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.635
cmtsm6xh00047qsg5buvc6p7y	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo80n0019y4g50195ckf2	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.653
cmtsm6xh30048qsg5q69as8jb	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo80n0019y4g50195ckf2	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.655
cmtsm6xi9004dqsg5c40tu8he	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo8nk001fy4g5y2djv750	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.697
cmtsm6xic004eqsg57hrhunif	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo8nk001fy4g5y2djv750	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.7
cmtsm6xir004gqsg5xh1y4smn	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo8tq001jy4g5e65cesvz	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.715
cmtsm6xit004hqsg5w83sh45a	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo8tq001jy4g5e65cesvz	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.717
cmtsm6xjt004mqsg5oreq41r5	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo94n001ry4g5dew9pp80	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.753
cmtsm6xjv004nqsg5136ssvqj	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo94n001ry4g5dew9pp80	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.755
cmtsm6xks004sqsg523rcuixs	MAIL_QUALIFIE	SYSTEME	\N	cmtsgo9h8001zy4g5t5nhwimp	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.788
cmtsm6xkt004tqsg5lzjylbeq	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo9h8001zy4g5t5nhwimp	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.789
cmtsm6xlq004yqsg58c4yos1p	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoh17004jy4g57156xepl	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.822
cmtsm6xlt004zqsg5d7mn3lbk	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoh17004jy4g57156xepl	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.825
cmtsm6xma0051qsg55imaqep2	MAIL_QUALIFIE	SYSTEME	\N	cmtsgohc9004my4g57fmr5v9q	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.842
cmtsm6xmc0052qsg5jfymfbsd	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgohc9004my4g57fmr5v9q	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.844
cmtsm6xnf0057qsg58imxxy6t	MAIL_QUALIFIE	SYSTEME	\N	cmtsgohs3004ty4g5meanvzxr	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.883
cmtsm6xnh0058qsg5ga95p49k	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgohs3004ty4g5meanvzxr	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.885
cmtsm6xok005dqsg5ujrfv5qy	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoibf0051y4g5b69jmta2	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.924
cmtsm6xom005eqsg553hbd8pz	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoibf0051y4g5b69jmta2	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.926
cmtsm6xp3005gqsg5gljp0phg	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoime0055y4g5wo86qqpx	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.943
cmtsm6xp4005hqsg5zl6y67re	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoime0055y4g5wo86qqpx	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.944
cmtsm6xqe005pqsg5i5y4ivc8	MAIL_QUALIFIE	SYSTEME	\N	cmtsgojih005ey4g5bcsh395t	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.99
cmtsm6xqg005qqsg55bzwo87f	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgojih005ey4g5bcsh395t	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.992
cmtsm6xqx005sqsg5rbfvr5x9	MAIL_QUALIFIE	SYSTEME	\N	cmtsgojss005hy4g543n81men	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.009
cmtsm6xqy005tqsg5222zv7ie	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgojss005hy4g543n81men	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.011
cmtsm6xs1005yqsg5dxx1o7l3	MAIL_QUALIFIE	SYSTEME	\N	cmtsgokbk005ny4g5fgf1dhz8	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.049
cmtsm6xs3005zqsg5xddjiy3v	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgokbk005ny4g5fgf1dhz8	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.051
cmtsm6xt60064qsg5s5r2054c	MAIL_QUALIFIE	SYSTEME	\N	cmtsgokvz005ty4g56ymkf1te	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.09
cmtsm6xt80065qsg5otgxmxfk	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgokvz005ty4g56ymkf1te	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.092
cmtsm6xtp0067qsg5dqh8t6my	MAIL_QUALIFIE	SYSTEME	\N	cmtsgol74005wy4g50b3axzfw	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.109
cmtsm6xtq0068qsg51sfxx1rw	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgol74005wy4g50b3axzfw	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.111
cmtsm6xu6006aqsg5i9c9zgij	MAIL_QUALIFIE	SYSTEME	\N	cmtsgolgs005zy4g5nchb02i5	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.126
cmtsm6xu8006bqsg5a7a5ir9g	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgolgs005zy4g5nchb02i5	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.128
cmtsm6xut006dqsg5dtrtcy9c	MAIL_QUALIFIE	SYSTEME	\N	cmtsgolq50062y4g56iitl3w0	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.149
cmtsm6xuu006eqsg5hq6a5wg5	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgolq50062y4g56iitl3w0	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.15
cmtsm6xvd006gqsg5510msfzf	MAIL_QUALIFIE	SYSTEME	\N	cmtsgolzx0065y4g50uyrdnql	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.169
cmtsm6xvf006hqsg5l15qptpz	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgolzx0065y4g50uyrdnql	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.171
cmtsm6xwd006mqsg51hfqusv9	MAIL_QUALIFIE	SYSTEME	\N	cmtsgomkf006by4g5kk5bp1xm	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.205
cmtsm6xwf006nqsg51xc4fc7v	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgomkf006by4g5kk5bp1xm	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.207
cmtsm6xy3006vqsg5mk2iid70	MAIL_QUALIFIE	SYSTEME	\N	cmtsgongf006ky4g5pn70rj2w	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.267
cmtsm6xy5006wqsg5okozd5pn	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgongf006ky4g5pn70rj2w	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.269
cmtsm6xyl006yqsg5zjj1klen	MAIL_QUALIFIE	SYSTEME	\N	cmtsgonqp006ny4g5rzwzii5w	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.285
cmtsm6xyn006zqsg5obedkb4g	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgonqp006ny4g5rzwzii5w	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.287
cmtsm6y030077qsg5u8sc7rhx	MAIL_QUALIFIE	SYSTEME	\N	cmtsgookg006zy4g526oxyyo4	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.339
cmtsm6y050078qsg56mxiocop	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgookg006zy4g526oxyyo4	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.341
cmtsm6y15007dqsg5sezfb7du	MAIL_QUALIFIE	SYSTEME	\N	cmtsgop7m0075y4g5vvrpq4n7	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.377
cmtsm6y17007eqsg5r2jf4tyl	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgop7m0075y4g5vvrpq4n7	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.379
cmtsm6y2k007jqsg56wap4asz	MAIL_QUALIFIE	SYSTEME	\N	cmtsgops1007by4g5w90fho1y	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.428
cmtsm6y2n007kqsg5remfth6b	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgops1007by4g5w90fho1y	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.431
cmtsm6y3n007pqsg5frqs6x9b	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoqkj007hy4g55xpgfcot	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.467
cmtsm6y3p007qqsg5qw2kp3kg	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoqkj007hy4g55xpgfcot	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.469
cmtsm6y4r007vqsg5cqt2lrtb	MAIL_QUALIFIE	SYSTEME	\N	cmtsgor2c007py4g5jawyc6x9	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.507
cmtsm6y4t007wqsg59yuahake	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgor2c007py4g5jawyc6x9	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.509
cmtsm6y5s0081qsg5es1zwfrg	MAIL_QUALIFIE	SYSTEME	\N	cmtsgorp1007xy4g5w3b0mokg	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.544
cmtsm6y5u0082qsg5w622ouid	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgorp1007xy4g5w3b0mokg	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.547
cmtsm6xpi005jqsg59axaitua	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoixy0058y4g5xrzh9w0f	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.958
cmtsm6xpk005kqsg5zg88sack	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoixy0058y4g5xrzh9w0f	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.96
cmtsm6xpy005mqsg5jttrkcf6	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoj7i005by4g53nudad4y	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:05.974
cmtsm6xq0005nqsg5zt21yj53	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoj7i005by4g53nudad4y	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:05.976
cmtsm6xrh005vqsg5zfoqjii8	MAIL_QUALIFIE	SYSTEME	\N	cmtsgok1z005ky4g5y1bwph9e	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.03
cmtsm6xrk005wqsg50r8bd69c	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgok1z005ky4g5y1bwph9e	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.032
cmtsm6xso0061qsg5c2nc7oa1	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoklf005qy4g57pfwoe4i	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.072
cmtsm6xsq0062qsg50hqjbvtw	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoklf005qy4g57pfwoe4i	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.074
cmtsm6xvu006jqsg52v7btr7i	MAIL_QUALIFIE	SYSTEME	\N	cmtsgomab0068y4g53n6axff9	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.186
cmtsm6xvw006kqsg5gm1vk6fg	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgomab0068y4g53n6axff9	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.188
cmtsm6xwy006pqsg5se5hxbxk	MAIL_QUALIFIE	SYSTEME	\N	cmtsgomul006ey4g5117dmr5k	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.226
cmtsm6xx3006qqsg57cgg6gyq	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgomul006ey4g5117dmr5k	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.231
cmtsm6xxk006sqsg5c8fxzxyn	MAIL_QUALIFIE	SYSTEME	\N	cmtsgon5n006hy4g5jng7aybn	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.248
cmtsm6xxm006tqsg530f8prt9	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgon5n006hy4g5jng7aybn	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.25
cmtsm6xz30071qsg54hok2jl7	MAIL_QUALIFIE	SYSTEME	\N	cmtsgonxd006ry4g5o81xamd0	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.303
cmtsm6xz60072qsg5qazss0ag	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgonxd006ry4g5o81xamd0	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.306
cmtsm6xzl0074qsg5qkgj6b0e	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoo96006wy4g59j3m9a3u	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.321
cmtsm6xzn0075qsg5k2rwdw52	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoo96006wy4g59j3m9a3u	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.323
cmtsm6y0k007aqsg5sg5cz259	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoow30072y4g54mwgg1wv	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.356
cmtsm6y0m007bqsg5w9x6lsh8	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoow30072y4g54mwgg1wv	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.358
cmtsm6y1o007gqsg5wus0y4ku	MAIL_QUALIFIE	SYSTEME	\N	cmtsgopho0078y4g516epj1n5	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.396
cmtsm6y1s007hqsg516vehrlt	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgopho0078y4g516epj1n5	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.4
cmtsm6y34007mqsg5up03t1pw	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoq9f007ey4g5kt1ub1wm	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.448
cmtsm6y36007nqsg5uy3rt249	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoq9f007ey4g5kt1ub1wm	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.45
cmtsm6y44007sqsg531hkgjn1	MAIL_QUALIFIE	SYSTEME	\N	cmtsgoqu7007ly4g5nlxu6s8w	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.484
cmtsm6y45007tqsg5evuk4ldw	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoqu7007ly4g5nlxu6s8w	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.485
cmtsm6y5a007yqsg51vpyzokx	MAIL_QUALIFIE	SYSTEME	\N	cmtsgorcs007sy4g5e4pwr6qo	Catégorie Commercial, offres, contrats	\N	\N	2026-09-08 11:57:06.526
cmtsm6y5d007zqsg5jes3l8c3	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgorcs007sy4g5e4pwr6qo	Attribué à Mamadou Berthé	\N	\N	2026-09-08 11:57:06.529
cmtsnjvlq00044sg53w62wo9j	ECHANGE_CLOS	SYSTEME	\N	\N	Hors périmètre : Test de classement en lot vers HORS_PERIMETRE	\N	\N	2026-09-08 12:35:09.375
cmtsnjvn300054sg5v03urdb1	ECHANGE_CLOS	SYSTEME	\N	\N	Hors périmètre : Test de classement en lot vers HORS_PERIMETRE	\N	\N	2026-09-08 12:35:09.423
cmtsnjvng00064sg572w62jtw	ECHANGE_CLOS	SYSTEME	\N	\N	Hors périmètre : Test de classement en lot vers HORS_PERIMETRE	\N	\N	2026-09-08 12:35:09.436
cmtsnl5ju00046wg578rfjcz0	ECHANGE_CLOS	SYSTEME	\N	\N	Hors périmètre : Test de classement en lot vers HORS_PERIMETRE	\N	\N	2026-09-08 12:36:08.922
cmtsnl5kg00056wg5dxt0y7eu	ECHANGE_CLOS	SYSTEME	\N	\N	Hors périmètre : Test de classement en lot vers HORS_PERIMETRE	\N	\N	2026-09-08 12:36:08.944
cmtsnl5ks00066wg50j7o9pzl	ECHANGE_CLOS	SYSTEME	\N	\N	Hors périmètre : Test de classement en lot vers HORS_PERIMETRE	\N	\N	2026-09-08 12:36:08.956
cmttzpa1h0001w8g5o0azf8qm	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoa8z0029y4g53l3ery6y	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-13T11:26:36.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-14T11:26:36.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:02.933
cmttzpa3c0002w8g5w99o8mlv	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoa8z0029y4g53l3ery6y	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03
cmttzpa6i0004w8g5792hdu0k	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoakd002cy4g56ysi0yfp	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-13T11:32:16.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-14T11:32:16.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.114
cmttzpa6r0005w8g53od3dl0z	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoakd002cy4g56ysi0yfp	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.123
cmttzpa890007w8g5wqq3tm5x	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoav2002fy4g5otcyvmwt	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-13T11:32:56.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-14T11:32:56.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.177
cmttzpa8f0008w8g5w5prmbq1	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoav2002fy4g5otcyvmwt	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.183
cmtvvpxvw000ps4g5ij8m06pm	MAIL_ENREGISTRE	SYSTEME	\N	cmtvvpxvk000os4g5nutihx80	essai-mailflow@client-externe.example · MAILFLOW-E2E 2026-09-10T18:46 — devis à transférer	\N	\N	2026-09-10 18:47:07.724
cmtvvpylh000vs4g5tfll836b	REPONSE_DETECTEE	SYSTEME	\N	cmtsgoi0v004xy4g5edx8sum0	Réponse <DBAP193MB1052BDC232764C11CF3C9741A9B12@DBAP193MB1052.EURP193.PROD.OUTLOOK.COM>	null	null	2026-09-10 18:47:08.645
cmtvvq3ku0002oog53ivo1hka	MAIL_TRANSMIS	SYSTEME	\N	cmtvvpxvk000os4g5nutihx80	Transfert réussi vers mamounberthe@gmail.com	\N	{"messageId": "<mailflow-transfer-mtvvq068-9cbvr13s@samko.group>", "destination": "mamounberthe@gmail.com"}	2026-09-10 18:47:15.103
cmtvx5gng0004h8g5dacxls4d	MAIL_ENREGISTRE	SYSTEME	\N	cmtvx5gke0003h8g5n2fufqi6	essai-mailflow@client-externe.example · MAILFLOW-E2E 2026-09-10T19:27 — devis à transférer	\N	\N	2026-09-10 19:27:11.5
cmtvx5lf60003oog5kd58j2ej	MAIL_TRANSMIS	SYSTEME	\N	cmtvx5gke0003h8g5n2fufqi6	Transfert réussi vers mamounberthe@gmail.com	\N	{"messageId": "<mailflow-transfer-mtvx5iup-0tw8p3ww@samko.group>", "destination": "mamounberthe@gmail.com"}	2026-09-10 19:27:17.682
cmttzpa9t000aw8g5tu0sssuu	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgob5v002iy4g5xd5u2h8a	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-13T11:40:17.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-14T11:40:17.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.233
cmttzpaa0000bw8g5v3z5faal	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgob5v002iy4g5xd5u2h8a	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.24
cmttzpacx000gw8g5tqnfeeit	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgobrr002oy4g5nhzegcu1	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-13T11:45:56.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-14T11:45:56.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.345
cmttzpad2000hw8g5cu0yeyqf	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgobrr002oy4g5nhzegcu1	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.35
cmttzpafz000mw8g5u71w2g8l	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoen0003yy4g5wyanze9i	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-18T11:25:16.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-19T11:25:16.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.455
cmttzpag3000nw8g5j8fny91k	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoen0003yy4g5wyanze9i	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.46
cmttzpais000sw8g5kr41bdup	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgof5x0044y4g5cpswnx1h	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-18T11:25:56.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-19T11:25:56.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.556
cmttzpaiw000tw8g52j79kthb	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgof5x0044y4g5cpswnx1h	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.56
cmttzpali000yw8g5gt6ge2j0	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgofu5004ay4g5hdd3rvxy	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-18T15:36:16.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-19T15:36:16.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.654
cmttzpalm000zw8g5ve5w8lo7	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgofu5004ay4g5hdd3rvxy	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.658
cmttzpao50014w8g5k87nj2rc	MAIL_REQUALIFIE	SYSTEME	\N	cmtrremyx00077gg58sd1lvbc	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-07T08:22:13.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-08T08:22:13.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.749
cmttzpao80015w8g54n0nru4s	MAIL_ATTRIBUE	SYSTEME	\N	cmtrremyx00077gg58sd1lvbc	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.752
cmttzparn001aw8g5nefvotlg	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrerri000e7gg5kcbczxkv	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-07T11:13:51.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-08T11:13:51.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.875
cmttzparr001bw8g56ifuwlb8	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrerri000e7gg5kcbczxkv	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.879
cmttzpatz001gw8g5z4qgt76n	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrexyq000k7gg5fion4por	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-09T13:13:44.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-10T13:13:44.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.959
cmttzpau3001hw8g5yqz6lxyt	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrexyq000k7gg5fion4por	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.963
cmttzpawr001mw8g5dxk3d61b	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrf3ht000q7gg5rgb7h7im	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-09T13:15:44.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-10T13:15:44.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.059
cmttzpawv001nw8g562xtz8g2	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrf3ht000q7gg5rgb7h7im	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.064
cmttzpaz7001sw8g5ftoi4s49	MAIL_REQUALIFIE	SYSTEME	\N	cmtrb2400001b04g52crh2evj	Catégorie Administratif courant, personnel	{"echeance": "2026-09-09T08:00:00.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-10T08:00:00.000Z", "categorie": "cmtqgt58z000i9gg5lw4xh259", "responsable": "cmtrb238z000804g5igkoyh1j"}	2026-09-09 11:03:04.147
cmttzpazb001tw8g511iedwwl	MAIL_ATTRIBUE	SYSTEME	\N	cmtrb2400001b04g52crh2evj	Réattribué à Bintou Keïta (correction)	null	null	2026-09-09 11:03:04.151
cmttzpb1m001yw8g5605nza11	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrfbbm000z7gg5btt0mkpo	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-09T13:34:23.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-10T13:34:23.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.234
cmttzpb1q001zw8g5gggcn6ci	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrfbbm000z7gg5btt0mkpo	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.238
cmttzpb490024w8g5oeq7nl6u	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo4kh0004y4g5x8cb73ha	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-07T14:50:56.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-10T14:50:56.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.329
cmttzpb4c0025w8g5llfcvdok	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo4kh0004y4g5x8cb73ha	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.332
cmttzpb6s002aw8g5lvmyplrh	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo56k000ay4g5a8doxgqa	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-07T14:53:56.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-10T14:53:56.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.42
cmttzpb6v002bw8g5igi8ach9	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo56k000ay4g5a8doxgqa	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.423
cmttzpab9000dw8g502x9ba66	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgobga002ly4g5rk9g0koh	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-13T11:43:55.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-14T11:43:55.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.285
cmttzpabg000ew8g5vcjzw6y4	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgobga002ly4g5rk9g0koh	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.292
cmttzpaef000jw8g59rb07sbs	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgodwd003ry4g50ov00o56	Catégorie Technique, exploitation	{"echeance": "2026-08-17T11:38:34.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-14T11:38:34.000Z", "categorie": "cmtqgt58q000e9gg50mg8f4oa", "responsable": "cmtrb239k000904g5zjr5hvz1"}	2026-09-09 11:03:03.399
cmttzpaej000kw8g5tng1msm1	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgodwd003ry4g50ov00o56	Réattribué à Seydou Coulibaly (correction)	null	null	2026-09-09 11:03:03.403
cmttzpahd000pw8g5cafd4frh	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoewx0041y4g57zq8vadx	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-18T11:25:36.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-19T11:25:36.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.505
cmttzpahi000qw8g5asl22d3p	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoewx0041y4g57zq8vadx	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.51
cmttzpak6000vw8g5zlzza06t	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgofgo0047y4g5szcewaov	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-18T11:26:18.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-19T11:26:18.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.606
cmttzpaka000ww8g5winrdl45	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgofgo0047y4g5szcewaov	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.61
cmttzpamr0011w8g5rs29ern1	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoga6004dy4g5m91sslcc	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-18T17:05:46.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-19T17:05:46.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.699
cmttzpamv0012w8g5cvs4pz6w	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoga6004dy4g5m91sslcc	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.703
cmttzpaqa0017w8g5gwbtzhex	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrep3w000b7gg5x9obo8vt	Catégorie Technique, exploitation	{"echeance": "2026-09-07T11:12:08.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-04T11:12:08.000Z", "categorie": "cmtqgt58q000e9gg50mg8f4oa", "responsable": "cmtrb239k000904g5zjr5hvz1"}	2026-09-09 11:03:03.826
cmttzpaqe0018w8g53ctccur4	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrep3w000b7gg5x9obo8vt	Réattribué à Seydou Coulibaly (correction)	null	null	2026-09-09 11:03:03.83
cmttzpass001dw8g56y4jpgae	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrev41000h7gg5pz5mbfwy	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-07T11:15:11.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-08T11:15:11.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:03.916
cmttzpasv001ew8g5ybmmd43r	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrev41000h7gg5pz5mbfwy	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:03.919
cmttzpavg001jw8g5fbreg31d	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrf0hv000n7gg5wju6b06i	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-09T13:14:43.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-10T13:14:43.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.012
cmttzpavk001kw8g5sd894ly4	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrf0hv000n7gg5wju6b06i	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.016
cmttzpay0001pw8g55iox07so	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrf6kk000t7gg5u55w0fxz	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-09T13:30:43.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-10T13:30:43.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.104
cmttzpay3001qw8g58ekkgfna	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrf6kk000t7gg5u55w0fxz	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.107
cmttzpb0d001vw8g5s0dnl2fh	MAIL_REQUALIFIE	SYSTEME	\N	cmtrb240h001d04g5aua0ffc7	Catégorie Approvisionnement, logistique, transit	{"echeance": "2026-09-09T08:00:00.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-08T08:00:00.000Z", "categorie": "cmtqgt58400069gg551dxuk92", "responsable": "cmtrb239k000904g5zjr5hvz1"}	2026-09-09 11:03:04.189
cmttzpb0h001ww8g5r8to2axv	MAIL_ATTRIBUE	SYSTEME	\N	cmtrb240h001d04g5aua0ffc7	Réattribué à Seydou Coulibaly (correction)	null	null	2026-09-09 11:03:04.193
cmttzpb2w0021w8g57c9rtq3e	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo43i0001y4g59imk5k28	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-07T08:00:00.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-10T08:00:00.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.28
cmttzpb300022w8g5kfdd02hm	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo43i0001y4g59imk5k28	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.284
cmttzpb5h0027w8g5ii9t7qck	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo4vh0007y4g5gd9j9x9j	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-07T14:53:55.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-10T14:53:55.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.373
cmttzpb5m0028w8g5o1xp985k	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo4vh0007y4g5gd9j9x9j	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.378
cmttzpb88002dw8g59sepvlzm	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo5i0000dy4g56et0z1vf	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-10T14:31:54.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-11T14:31:54.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.472
cmttzpb8b002ew8g5940ij0q9	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo5i0000dy4g56et0z1vf	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.475
cmttzpb96002gw8g5a9xcb4sf	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo5sm000gy4g5gnj7agvp	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-10T16:47:05.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-11T16:47:05.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.506
cmttzpb9a002hw8g5sos61hg2	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo5sm000gy4g5gnj7agvp	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.51
cmttzpbb2002mw8g5ma9w2whj	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo7hy000zy4g50gkk03su	Catégorie Administratif courant, personnel	{"echeance": "2026-08-11T12:02:57.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-12T12:02:57.000Z", "categorie": "cmtqgt58z000i9gg5lw4xh259", "responsable": "cmtrb238z000804g5igkoyh1j"}	2026-09-09 11:03:04.574
cmttzpbb6002nw8g54depsq7h	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo7hy000zy4g50gkk03su	Réattribué à Bintou Keïta (correction)	null	null	2026-09-09 11:03:04.578
cmttzpbe7002vw8g5sy56l19u	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoh17004jy4g57156xepl	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-19T10:35:26.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-20T10:35:26.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.687
cmttzpbea002ww8g5agy8fss5	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoh17004jy4g57156xepl	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.69
cmttzpbg90031w8g56q9znk0f	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgohm5004py4g5tvc42ntd	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-19T10:57:27.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-20T10:57:27.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.761
cmttzpbgc0032w8g55t4e89ue	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgohm5004py4g5tvc42ntd	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.764
cmttzpbin0037w8g5bbjfstgx	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoixy0058y4g5xrzh9w0f	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T10:48:12.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T10:48:12.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.847
cmttzpbir0038w8g5yt3h8941	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoixy0058y4g5xrzh9w0f	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.851
cmttzpbla003dw8g5k5vdjzw5	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgok1z005ky4g5y1bwph9e	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T10:50:33.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T10:50:33.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.942
cmttzpble003ew8g59mfhcqc9	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgok1z005ky4g5y1bwph9e	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.946
cmttzpbmd003gw8g5wmju3luu	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgokbk005ny4g5fgf1dhz8	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T10:50:33.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T10:50:33.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.981
cmttzpbmg003hw8g55cmkhm43	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgokbk005ny4g5fgf1dhz8	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.984
cmttzpbod003mw8g5s4oo1bw2	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgokvz005ty4g56ymkf1te	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T10:53:13.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T10:53:13.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.053
cmttzpbog003nw8g56w2cjpdw	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgokvz005ty4g56ymkf1te	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.056
cmttzpbqp003sw8g547p8t0m9	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgolgs005zy4g5nchb02i5	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T11:30:53.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T11:30:53.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.137
cmttzpbqr003tw8g5n58jt9hh	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgolgs005zy4g5nchb02i5	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.139
cmttzpbsq003yw8g52r4sylhv	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgolzx0065y4g50uyrdnql	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-25T10:52:41.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-26T10:52:41.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.21
cmttzpbst003zw8g5gxw9bwv5	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgolzx0065y4g50uyrdnql	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.213
cmttzpbux0044w8g5zi9prpja	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgomul006ey4g5117dmr5k	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-25T11:41:53.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-26T11:41:53.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.289
cmttzpbv10045w8g5f07mwp25	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgomul006ey4g5117dmr5k	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.293
cmttzpbx8004aw8g5jfwxwvo7	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgongf006ky4g5pn70rj2w	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-25T11:42:24.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-26T11:42:24.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.372
cmttzpbxc004bw8g51lcjx61p	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgongf006ky4g5pn70rj2w	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.376
cmttzpbyd004dw8g5egyiu79x	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgonqp006ny4g5rzwzii5w	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-25T14:29:57.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-26T14:29:57.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.413
cmttzpbyg004ew8g5le53trsz	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgonqp006ny4g5rzwzii5w	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.416
cmttzpba3002jw8g592l8w6tf	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo6v3000sy4g54o1w189t	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-11T09:46:15.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-12T09:46:15.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.539
cmttzpba6002kw8g5xirs1x8b	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo6v3000sy4g54o1w189t	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.542
cmttzpbc5002pw8g5pnb7stf5	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo8ce001cy4g5wr4aw71m	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-12T10:47:43.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-13T10:47:43.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.613
cmttzpbc9002qw8g5ig2rioc4	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo8ce001cy4g5wr4aw71m	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.617
cmttzpbd7002sw8g5uw0vfcw6	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo8nk001fy4g5y2djv750	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-12T10:48:04.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-13T10:48:04.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.651
cmttzpbda002tw8g528uvmrwb	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo8nk001fy4g5y2djv750	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.654
cmttzpbf9002yw8g57kh7ta6b	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgohc9004my4g57fmr5v9q	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-19T10:35:26.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-20T10:35:26.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.725
cmttzpbfc002zw8g5scskf1is	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgohc9004my4g57fmr5v9q	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.728
cmttzpbhd0034w8g5wdic0stw	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoibf0051y4g5b69jmta2	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T08:00:00.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T08:00:00.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.802
cmttzpbhi0035w8g5v5kmjkq1	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoibf0051y4g5b69jmta2	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.806
cmttzpbjx003aw8g5nfj7umv6	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoj7i005by4g53nudad4y	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T10:48:32.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T10:48:32.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:04.893
cmttzpbk2003bw8g5hht93iv2	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoj7i005by4g53nudad4y	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:04.898
cmttzpbnd003jw8g5eodijhr3	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoklf005qy4g57pfwoe4i	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T10:52:53.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T10:52:53.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.017
cmttzpbng003kw8g52rj0k3n6	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoklf005qy4g57pfwoe4i	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.02
cmttzpbpg003pw8g5rizuy7rd	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgol74005wy4g50b3axzfw	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T10:53:14.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T10:53:14.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.092
cmttzpbpk003qw8g5lr4dckm7	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgol74005wy4g50b3axzfw	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.096
cmttzpbro003vw8g5veq1lt9k	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgolq50062y4g56iitl3w0	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T11:31:32.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T11:31:32.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.172
cmttzpbrr003ww8g5nakffzw1	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgolq50062y4g56iitl3w0	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.176
cmttzpbtt0041w8g5kz372zdc	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgomab0068y4g53n6axff9	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-25T11:07:32.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-26T11:07:32.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.249
cmttzpbtw0042w8g57g1m9b4p	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgomab0068y4g53n6axff9	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.252
cmttzpbw30047w8g5j1lpw68i	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgon5n006hy4g5jng7aybn	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-25T11:41:55.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-26T11:41:55.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.331
cmttzpbw70048w8g5964sjcaq	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgon5n006hy4g5jng7aybn	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.335
cmttzpbzj004gw8g5zkr06k9h	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoo96006wy4g59j3m9a3u	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-26T08:36:39.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-27T08:36:39.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.455
cmttzpbzn004hw8g5v2c36xjl	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoo96006wy4g59j3m9a3u	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.459
cmttzpc1p004mw8g5dh7ebqd7	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoow30072y4g54mwgg1wv	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-26T08:37:19.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-27T08:37:19.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.533
cmttzpc1t004nw8g5fnu2rr4g	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoow30072y4g54mwgg1wv	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.537
cmttzpc0m004jw8g5i96whkmk	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgookg006zy4g526oxyyo4	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-26T08:36:59.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-27T08:36:59.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.495
cmttzpc0q004kw8g5kqdw2if2	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgookg006zy4g526oxyyo4	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.498
cmttzpc2z004pw8g595gvnfxd	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo9xq0026y4g5n03aud9m	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-13T11:12:36.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-14T11:12:36.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.579
cmttzpc33004qw8g5pfy4fv7k	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo9xq0026y4g5n03aud9m	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.583
cmttzpc5d004vw8g5jg9bz7zw	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoq9f007ey4g5kt1ub1wm	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-31T12:10:18.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-01T12:10:18.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.665
cmttzpc5h004ww8g50rfoxkdd	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoq9f007ey4g5kt1ub1wm	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.669
cmttzpc870051w8g53f3keyb2	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoqu7007ly4g5nlxu6s8w	Catégorie Administratif courant, personnel	{"echeance": "2026-08-31T13:16:09.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-01T13:16:09.000Z", "categorie": "cmtqgt58z000i9gg5lw4xh259", "responsable": "cmtrb238z000804g5igkoyh1j"}	2026-09-09 11:03:05.767
cmttzpc8b0052w8g51270x4v3	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoqu7007ly4g5nlxu6s8w	Réattribué à Bintou Keïta (correction)	null	null	2026-09-09 11:03:05.771
cmttzpcac0057w8g574oxuu3d	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgorp1007xy4g5w3b0mokg	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-07T08:21:32.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-08T08:21:32.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.844
cmttzpcaf0058w8g502ox6oe6	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgorp1007xy4g5w3b0mokg	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.847
cmttzpcdu005gw8g50ct7aq5w	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo76s000vy4g5ngcmixeb	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-11T09:46:35.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-12T09:46:35.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.97
cmttzpcdx005hw8g5zi9gj8mi	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo76s000vy4g5ngcmixeb	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.973
cmttzpcg5005mw8g5cbamzc7m	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgopho0078y4g516epj1n5	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-26T08:37:39.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-27T08:37:39.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:06.053
cmttzpcg8005nw8g5armuiean	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgopho0078y4g516epj1n5	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:06.057
cmttzpci7005sw8g5hrt0jxxk	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrekia00047gg58eak12v9	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-07T08:21:52.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-08T08:21:52.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:06.127
cmttzpcib005tw8g5t48j8a90	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrekia00047gg58eak12v9	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:06.131
cmttzpckr005yw8g5pmekj52l	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrfdn400137gg55rf4lfit	Catégorie Technique, exploitation	{"echeance": "2026-09-10T08:00:00.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-09T08:00:00.000Z", "categorie": "cmtqgt58q000e9gg50mg8f4oa", "responsable": "cmtrb239k000904g5zjr5hvz1"}	2026-09-09 11:03:06.219
cmttzpcku005zw8g5mhr7lotp	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrfdn400137gg55rf4lfit	Réattribué à Seydou Coulibaly (correction)	null	null	2026-09-09 11:03:06.222
cmttzpcn60064w8g559ducorj	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgojss005hy4g543n81men	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T10:50:13.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T10:50:13.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:06.306
cmttzpcn90065w8g5u08askcg	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgojss005hy4g543n81men	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:06.309
cmttzpcp9006aw8g5pvtj21cm	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgop7m0075y4g5vvrpq4n7	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-26T08:37:19.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-27T08:37:19.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:06.381
cmttzpcpd006bw8g5bacw046s	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgop7m0075y4g5vvrpq4n7	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:06.385
cmttzpc46004sw8g5yzfciq2l	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgops1007by4g5w90fho1y	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-26T08:37:39.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-27T08:37:39.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.622
cmttzpc4a004tw8g5y0p5aeih	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgops1007by4g5w90fho1y	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.626
cmttzpc73004yw8g5shz6nemy	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoqkj007hy4g55xpgfcot	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-31T12:10:18.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-01T12:10:18.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.727
cmttzpc76004zw8g58dzs4whe	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoqkj007hy4g55xpgfcot	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.73
cmttzpc9a0054w8g5cyqhxsbl	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgorcs007sy4g5e4pwr6qo	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-04T10:14:18.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-07T10:14:18.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.806
cmttzpc9d0055w8g5shvpzkzj	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgorcs007sy4g5e4pwr6qo	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.809
cmttzpcbm005aw8g5piu0bysa	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgoc2p002ry4g54pc4cjw3	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-13T11:49:15.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-14T11:49:15.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.89
cmttzpcbp005bw8g58oz25l0j	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgoc2p002ry4g54pc4cjw3	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.893
cmttzpcct005dw8g5xgw1zsgh	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgo6js000py4g5a2i13st2	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-11T09:45:35.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-12T09:45:35.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:05.933
cmttzpccw005ew8g531l14xlc	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgo6js000py4g5a2i13st2	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:05.936
cmttzpcf1005jw8g5qllmrwc6	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgogo7004gy4g5widtu34d	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-19T09:51:06.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-20T09:51:06.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:06.013
cmttzpcf5005kw8g5k9dxx1gf	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgogo7004gy4g5widtu34d	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:06.017
cmttzpch7005pw8g5651h77s4	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrehgl00017gg5c6lkpi6n	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-07T08:21:52.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-08T08:21:52.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:06.091
cmttzpcha005qw8g5z01idxno	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrehgl00017gg5c6lkpi6n	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:06.094
cmttzpcjg005vw8g5zegl029f	MAIL_REQUALIFIE	SYSTEME	\N	cmtrrf8x8000w7gg5sncdibo2	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-09-09T13:32:44.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-10T13:32:44.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:06.172
cmttzpcjk005ww8g5p2gwqz2n	MAIL_ATTRIBUE	SYSTEME	\N	cmtrrf8x8000w7gg5sncdibo2	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:06.176
cmttzpcm50061w8g50v9pxlbt	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgojih005ey4g5bcsh395t	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-21T10:48:52.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-24T10:48:52.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:06.269
cmttzpcm80062w8g5azqjjqf5	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgojih005ey4g5bcsh395t	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:06.272
cmttzpco60067w8g50463t5ty	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgomkf006by4g5kk5bp1xm	Catégorie Date butoir imposée (tutelle, douane, fiscalité)	{"echeance": "2026-08-25T11:41:52.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-08-26T11:41:52.000Z", "categorie": "cmtqgt57h00039gg538o7p8fy", "responsable": "cmtrb238n000704g585q1vjii"}	2026-09-09 11:03:06.342
cmttzpco90068w8g5togwrkec	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgomkf006by4g5kk5bp1xm	Réattribué à Fatoumata Diallo (correction)	null	null	2026-09-09 11:03:06.345
cmttzpcqa006dw8g5rtqtn0t2	MAIL_REQUALIFIE	SYSTEME	\N	cmtsgor2c007py4g5jawyc6x9	Catégorie Administratif courant, personnel	{"echeance": "2026-09-03T08:00:00.000Z", "categorie": "cmtqgt58f000a9gg5l8lc9s0l", "responsable": "cmtrb2372000604g5852ipk4u"}	{"echeance": "2026-09-04T08:00:00.000Z", "categorie": "cmtqgt58z000i9gg5lw4xh259", "responsable": "cmtrb238z000804g5igkoyh1j"}	2026-09-09 11:03:06.418
cmttzpcqd006ew8g5ssouxmmr	MAIL_ATTRIBUE	SYSTEME	\N	cmtsgor2c007py4g5jawyc6x9	Réattribué à Bintou Keïta (correction)	null	null	2026-09-09 11:03:06.421
cmtvfq4li0000hwg589jw5etx	MAIL_ATTRIBUE	UTILISATEUR	cmtrb2372000604g5852ipk4u	cmtsgor2c007py4g5jawyc6x9	Réattribué à Bintou Keïta	null	null	2026-09-10 11:19:22.566
cmtvfq5t10001hwg5ww9v2knj	MAIL_ATTRIBUE	UTILISATEUR	cmtrb2372000604g5852ipk4u	cmtsgor2c007py4g5jawyc6x9	Réattribué à Bintou Keïta	null	null	2026-09-10 11:19:24.133
cmtvfqejp0003hwg5ydqtj09f	REPONSE_DECLAREE	UTILISATEUR	cmtrb2372000604g5852ipk4u	cmtsgor2c007py4g5jawyc6x9	Réponse déclarée, canal TELEPHONE	null	null	2026-09-10 11:19:35.461
cmtvvpvu00009s4g50oz9vyo1	MAIL_ENREGISTRE	SYSTEME	\N	cmtvvpvp30008s4g5toty9vte	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-10 18:47:05.064
cmtvvpw89000cs4g57mzb36gz	MAIL_ENREGISTRE	SYSTEME	\N	cmtvvpw81000bs4g5je7hoei5	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-10 18:47:05.577
cmtvvpwld000fs4g5wr0wp761	MAIL_ENREGISTRE	SYSTEME	\N	cmtvvpwl2000es4g53vo9hgp1	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-10 18:47:06.049
cmtvvpx4f000is4g57wchz4jf	MAIL_ENREGISTRE	SYSTEME	\N	cmtvvpx45000hs4g526kj3ptg	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-10 18:47:06.735
cmtvvpxll000ls4g55rqmkn7a	MAIL_ENREGISTRE	SYSTEME	\N	cmtvvpxl9000ks4g5ewwlg35x	e-impot@dgi.gouv.ml · E-Impôt- Avis de courriel	\N	\N	2026-09-10 18:47:07.353
\.


--
-- Data for Name: expediteur_exclu; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.expediteur_exclu (id, type, valeur, motif, actif, cree_le) FROM stdin;
cmtqgt59c000m9gg5jfbmktzx	MOTIF	^(newsletter|news|info|marketing|promo)@	Diffusion commerciale	t	2026-09-06 23:50:52.128
cmtqgt59d000n9gg5x4sgrk3h	MOTIF	^(notification|notifications|alert|alerts)@	Notifications applicatives	t	2026-09-06 23:50:52.129
cmtqgt59f000o9gg5k5ww12n7	MOTIF	^(mailer-daemon|postmaster)@	Messages de service (traités à part comme incidents)	t	2026-09-06 23:50:52.131
cmtrr9jqx0000z4g5f7mzeov1	MOTIF	^Code d'authentification	Code à usage unique, jamais un échange à suivre (observé sur e-impot@dgi.gouv.ml)	t	2026-09-07 21:31:19.738
cmtqgt596000l9gg59w7rx1bd	MOTIF	^(no-?reply|ne-pas-repondre|donotreply)[^@]*@	Adresses sans réponse possible	t	2026-09-06 23:50:52.122
\.


--
-- Data for Name: jour_ferie; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.jour_ferie (id, date, libelle) FROM stdin;
cmtrb2355000004g5w3hxxad1	2026-01-01	Jour de l'An
cmtrb2355000104g58cx16dva	2026-01-20	Fête de l'Armée
cmtrb2355000204g5mo3qrxel	2026-03-26	Journée des Martyrs
cmtrb235b000304g5xgt098e9	2026-05-01	Fête du Travail
cmtrb235b000404g5yudthi6t	2026-09-22	Fête de l'Indépendance
cmtrb235c000504g5kcps5al5	2026-12-25	Noël
\.


--
-- Data for Name: message; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.message (id, echange_id, boite_id, internet_message_id, message_id_fournisseur, in_reply_to, "references", sens, expediteur, destinataires, copie, sujet, extrait, date_message, a_piece_jointe, est_automatique, est_non_remise, cree_le) FROM stdin;
cmtsgo4am0003y4g5cq845cte	cmtsgo43i0001y4g59imk5k28	cmtrr5oa8000020g5zpr8enij	<834f9837-67aa-71c9-a95c-debd0df66e31@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-04 23:01:42	f	f	f	2026-09-08 09:22:29.95
cmtsgo4kx0006y4g54vn8y24i	cmtsgo4kh0004y4g5x8cb73ha	cmtrr5oa8000020g5zpr8enij	<abf66c9a-f410-ac72-d7c7-e04662ed581c@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-05 14:50:56	f	f	f	2026-09-08 09:22:30.321
cmtsgo4w10009y4g5obcv8w07	cmtsgo4vh0007y4g5gd9j9x9j	cmtrr5oa8000020g5zpr8enij	<51a11872-79ad-c607-1ec2-52d13051f267@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-05 14:53:55	f	f	f	2026-09-08 09:22:30.721
cmtsgo570000cy4g56hg01p88	cmtsgo56k000ay4g5a8doxgqa	cmtrr5oa8000020g5zpr8enij	<7e63c88c-d544-5c17-6924-6b58baf43478@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-05 14:53:56	f	f	f	2026-09-08 09:22:31.116
cmtsgo5iq000fy4g5yl9onhpe	cmtsgo5i0000dy4g56et0z1vf	cmtrr5oa8000020g5zpr8enij	<a6ea522a-7552-2f99-d2f2-c1fddd243012@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-06 14:31:54	f	f	f	2026-09-08 09:22:31.538
cmtsgo5t6000iy4g5qwh2ivxf	cmtsgo5sm000gy4g5gnj7agvp	cmtrr5oa8000020g5zpr8enij	<22237531-ad0c-39c7-09c2-d82ac17ca5f3@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-06 16:47:05	f	f	f	2026-09-08 09:22:31.914
cmtsgo680000my4g5ji1t9lbi	cmtsgo67d000ky4g5vu29ykrw	cmtrr5oa8000020g5zpr8enij	<VI1PR01MB5295D3135FFD607052A015C3DFD22@VI1PR01MB5295.eurprd01.prod.exchangelabs.com>	\N	<AS8PR08MB794406673C2A52B6C7FF9B79A5F02@AS8PR08MB7944.eurprd08.prod.outlook.com>	{<AS8PR08MB794406673C2A52B6C7FF9B79A5F02@AS8PR08MB7944.eurprd08.prod.outlook.com>}	ENTRANT	laya.sidibe@cm.sanlamallianz.com	{dsissoko@samko.group,rebecca.kangaze@cm.sanlamallianz.com}	{wadjiri.nassourou@cm.sanlamallianz.com,ebenezer.djay@cm.sanlamallianz.com,msamake@samko-conseil.com,dec@samko.group,diabedoumbia@gmail.com}	RE: Transmission du rapport définitif de diagnostic  — comptes d'attente « 50 000 » et fonds en déshérence (réf. SAZ/001/04/2026)	\N	2026-08-06 17:59:57	f	f	f	2026-09-08 09:22:32.448
cmtsgo68x000oy4g5cur36z12	cmtsgo67d000ky4g5vu29ykrw	cmtrr5oa8000020g5zpr8enij	<AM7PR01MB66746FFC5586A9EC1C704771D6D12@AM7PR01MB6674.eurprd01.prod.exchangelabs.com>	\N	<VI1PR01MB5295D3135FFD607052A015C3DFD22@VI1PR01MB5295.eurprd01.prod.exchangelabs.com>	{<AS8PR08MB794406673C2A52B6C7FF9B79A5F02@AS8PR08MB7944.eurprd08.prod.outlook.com>,<VI1PR01MB5295D3135FFD607052A015C3DFD22@VI1PR01MB5295.eurprd01.prod.exchangelabs.com>}	ENTRANT	rebecca.kangaze@cm.sanlamallianz.com	{laya.sidibe@cm.sanlamallianz.com,dsissoko@samko.group}	{wadjiri.nassourou@cm.sanlamallianz.com,ebenezer.djay@cm.sanlamallianz.com,msamake@samko-conseil.com,dec@samko.group,diabedoumbia@gmail.com}	RE: Transmission du rapport définitif de diagnostic  — comptes d'attente « 50 000 » et fonds en déshérence (réf. SAZ/001/04/2026)	\N	2026-08-07 07:52:38	f	f	f	2026-09-08 09:22:32.481
cmtsgo6ko000ry4g58wf9gb7e	cmtsgo6js000py4g5a2i13st2	cmtrr5oa8000020g5zpr8enij	<fbfc5530-a07e-8594-ca7d-aff6f27566d8@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-07 09:45:35	f	f	f	2026-09-08 09:22:32.904
cmtsgo6vm000uy4g5tth54gzf	cmtsgo6v3000sy4g54o1w189t	cmtrr5oa8000020g5zpr8enij	<30e4acf1-ea6c-a1a1-9eb5-0ba5eeb319ca@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-07 09:46:15	f	f	f	2026-09-08 09:22:33.298
cmtsgo77a000xy4g58hl3rvix	cmtsgo76s000vy4g5ngcmixeb	cmtrr5oa8000020g5zpr8enij	<2c111362-bcee-56ce-23b4-470187c95173@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-07 09:46:35	f	f	f	2026-09-08 09:22:33.718
cmtsgo7ip0011y4g5jb3y232v	cmtsgo7hy000zy4g50gkk03su	cmtrr5oa8000020g5zpr8enij	<56b562cc-28a4-4043-80b7-25978a792d64@proman.lu>	\N	<AS8PR08MB7944F64F9744782CC22218E7A5D12@AS8PR08MB7944.eurprd08.prod.outlook.com>	{<d764544d-1b79-4177-875c-b20a25276e6f@proman.lu>,<AS8PR08MB7944F64F9744782CC22218E7A5D12@AS8PR08MB7944.eurprd08.prod.outlook.com>}	ENTRANT	mlefebvre@proman.lu	{dsissoko@samko.group,msamake@samko-conseil.com,dec@samko.group}	{bsissoko@proman-project.com,akobasky@proman.lu}	Re: 726_Validation de la TS-Emission de facture_Juin 2026_BRS_Projet FACEJ II	\N	2026-08-07 12:02:57	f	f	f	2026-09-08 09:22:34.129
cmtsgo7jz0013y4g5by38hcv5	cmtsgo7hy000zy4g50gkk03su	cmtrr5oa8000020g5zpr8enij	<DB8PR08MB39783A7BCB38C84B3017C920C5D12@DB8PR08MB3978.eurprd08.prod.outlook.com>	\N	<AS8PR08MB7944F64F9744782CC22218E7A5D12@AS8PR08MB7944.eurprd08.prod.outlook.com>	{<d764544d-1b79-4177-875c-b20a25276e6f@proman.lu>,<AS8PR08MB7944F64F9744782CC22218E7A5D12@AS8PR08MB7944.eurprd08.prod.outlook.com>}	ENTRANT	akobasky@proman.lu	{dsissoko@samko.group,mlefebvre@proman.lu,msamake@samko-conseil.com,dec@samko.group}	{bsissoko@proman-project.com}	RE: 726_Validation de la TS-Emission de facture_Juin 2026_BRS_Projet FACEJ II	\N	2026-08-07 12:29:34	f	f	f	2026-09-08 09:22:34.175
cmtsgo7v10017y4g58jzt6lcf	cmtsgo7u60015y4g5ricbvq34	cmtrr5oa8000020g5zpr8enij	<900426953.3488303.1786106120726@mail.yahoo.com>	\N	\N	{<900426953.3488303.1786106120726.ref@mail.yahoo.com>}	ENTRANT	drame1fr@yahoo.fr	{abdoulkarimmagassouba187@gmail.com,mariatououedraego@gmail.com,oumartraore953@gmail.com,mamoutou_kante@yahoo.fr,macrowasteltd@gmail.com,macrowastemali@gmail.com,dec@samko.group,b.diaye@scsinternationalmali.com,gpinealsarl@gmail.com,alysylla30@yahoo.fr,amaiga.cim@gmail.com,belco@groupetoguna.com,c.somboro@trigoneconseilmali.com,magassa2930@gmail.com,amadou2858@gmail.com,actiliancemali@gmail.com,amadouaydicko@gmail.com,chiaka.ouattara@alt-mali.com,solo77keita@gmail.com,rhamet93@gmail.com,alassanegoita@gmail.com,kadrisidibe@gmail.com,kadiatoufamenta19@yahoo.com,akoumare@fiscom.net,awatraore@impactmediaconseil.com,aloudiarra83@gmail.com,cacogef.sidibe@gmail.com,itchiero@egccinternational.com,abdelkadercoulibaly10@gmail.com,tambakaba30@gmail.com,diarraconseils@gmail.com,mady@ccffd.ml,alpha.cisse@alliedgold.com,globalfinancialconsulting30@gmail.com,aboubacarcisse578@gmail.com,eimpotdiarrasec@gmail.com,youbatandia@investimsa.com,bassekou1185@gmail.com,zatiemounkoro7@gmail.com,contact@koleomali.com,haissatou.haidara@gmail.com,moussatatadenkeita@gmail.com,kanidembele91@gmail.com,mamadoudaou43@yahoo.fr,becmservicecommercial@becmcg.com,globaltechindustry@gmail.com,djikineadama522@gmail.com,habibatousama@gmail.com,mcoulib18@gmail.com,traorbaskou@gmail.com}	{}	Questionnaire pour thèse.	\N	2026-08-07 12:35:20	f	f	f	2026-09-08 09:22:34.573
cmtsgo815001by4g57v2pt3ch	cmtsgo80n0019y4g50195ckf2	cmtrr5oa8000020g5zpr8enij	<lNul1M3NRQSzC87MEI43Tw@geopod-ismtpd-97>	\N	\N	{}	ENTRANT	no-reply-y0djikh8n06qjjpglijk0w@mail.anthropic.com	{dec@samko.group}	{}	Security alert: new Cowork remote device added to your Claude account	\N	2026-08-08 18:31:41	f	f	f	2026-09-08 09:22:34.793
cmtsgo8cv001ey4g5zo9wba3t	cmtsgo8ce001cy4g5wr4aw71m	cmtrr5oa8000020g5zpr8enij	<3a4d24ec-239f-fd71-d90e-713253e50c39@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-10 10:47:43	f	f	f	2026-09-08 09:22:35.216
cmtsgo8o0001hy4g5ues2jgt2	cmtsgo8nk001fy4g5y2djv750	cmtrr5oa8000020g5zpr8enij	<2f77c05c-e7ab-e567-ddcd-c81a1ef33bd6@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-10 10:48:04	f	f	f	2026-09-08 09:22:35.616
cmtsgo8tz001ly4g56i7dpk2u	cmtsgo8tq001jy4g5e65cesvz	cmtrr5oa8000020g5zpr8enij	<KfvYq0SKS8GdcL_giGrLRA@geopod-ismtpd-65>	\N	\N	{}	ENTRANT	no-reply-isbedpgpjng55ckepm0hew@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-10 14:34:28	\N	2026-08-10 14:34:28	f	f	f	2026-09-08 09:22:35.831
cmtsgo8z5001py4g5lhz8420c	cmtsgo8yx001ny4g5r56lfciy	cmtrr5oa8000020g5zpr8enij	<45ydVcFmTtemY34tmg4xqQ@geopod-ismtpd-94>	\N	\N	{}	ENTRANT	no-reply-zdhqduunggzlgjytjvmeja@mail.anthropic.com	{dec@samko.group}	{}	Security alert: new trusted device added to your Claude account	\N	2026-08-10 14:35:16	f	f	f	2026-09-08 09:22:36.018
cmtsgo956001ty4g5369ljdcq	cmtsgo94n001ry4g5dew9pp80	cmtrr5oa8000020g5zpr8enij	<o8Ei4UAwR_G1f3e-KI71cA@geopod-ismtpd-69>	\N	\N	{}	ENTRANT	no-reply-st6rblwi-u_nwgkp75r-rq@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:44:14	\N	2026-08-11 10:44:14	f	f	f	2026-09-08 09:22:36.234
cmtsgo9ax001xy4g585ykg2vd	cmtsgo9aj001vy4g5yoia1oxg	cmtrr5oa8000020g5zpr8enij	<VHn4EJ6LSU-3RXHMB-Ei1A@geopod-ismtpd-114>	\N	\N	{}	ENTRANT	no-reply-qisj46tjfk7splttmwglka@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:47:53	\N	2026-08-11 10:47:53	f	f	f	2026-09-08 09:22:36.441
cmtsgo9hp0021y4g5kruaxc8l	cmtsgo9h8001zy4g5t5nhwimp	cmtrr5oa8000020g5zpr8enij	<kuJ8OJW3Tv-QFBq6CMGbow@geopod-ismtpd-105>	\N	\N	{}	ENTRANT	no-reply-qt1ru8tt20qgbty1rrfqhg@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:54:49	\N	2026-08-11 10:54:49	f	f	f	2026-09-08 09:22:36.685
cmtsgo9nx0025y4g54hphzue3	cmtsgo9nf0023y4g5ox3bvpeg	cmtrr5oa8000020g5zpr8enij	<RJZnkgVbQz2r-AVS1YhU5w@geopod-ismtpd-51>	\N	\N	{}	ENTRANT	no-reply-po9rztvfp90ulor5h7h2tw@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 10:55:50	\N	2026-08-11 10:55:50	f	f	f	2026-09-08 09:22:36.909
cmtsgo9y90028y4g5qxunjl0m	cmtsgo9xq0026y4g5n03aud9m	cmtrr5oa8000020g5zpr8enij	<626afd6d-9112-85e4-0d2f-42ee0cfd4a7f@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-11 11:12:36	f	f	f	2026-09-08 09:22:37.281
cmtsgoa9h002by4g5hsfvtgpl	cmtsgoa8z0029y4g53l3ery6y	cmtrr5oa8000020g5zpr8enij	<461261de-1638-ddfd-bcbe-bfa4ad0870b8@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-11 11:26:36	f	f	f	2026-09-08 09:22:37.685
cmtsgoakr002ey4g5rxmpnfp0	cmtsgoakd002cy4g56ysi0yfp	cmtrr5oa8000020g5zpr8enij	<41491757-372a-6ab1-87a8-b57570ef9c35@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-11 11:32:16	f	f	f	2026-09-08 09:22:38.091
cmtsgoavj002hy4g5jbouevji	cmtsgoav2002fy4g5otcyvmwt	cmtrr5oa8000020g5zpr8enij	<1be7ea93-a773-368f-48fd-4e12acf13524@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-11 11:32:56	f	f	f	2026-09-08 09:22:38.479
cmtsgob61002ky4g55r5wv16s	cmtsgob5v002iy4g5xd5u2h8a	cmtrr5oa8000020g5zpr8enij	<43ac4465-78be-dda2-c3ee-5ba52370fe03@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-11 11:40:17	f	f	f	2026-09-08 09:22:38.857
cmtsgobgu002ny4g5fy7hzfnn	cmtsgobga002ly4g5rk9g0koh	cmtrr5oa8000020g5zpr8enij	<4bb74b5c-d9ea-1930-b73c-21df06cdcbea@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-11 11:43:55	f	f	f	2026-09-08 09:22:39.246
cmtsgobs3002qy4g5gt91t9xd	cmtsgobrr002oy4g5nhzegcu1	cmtrr5oa8000020g5zpr8enij	<c5a942be-9ab7-476c-451a-53755d1f2b3a@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-11 11:45:56	f	f	f	2026-09-08 09:22:39.651
cmtsgoc2z002ty4g5rklagmc8	cmtsgoc2p002ry4g54pc4cjw3	cmtrr5oa8000020g5zpr8enij	<0b0ed051-7425-2ad7-0e2f-24d8dd5c25d1@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-11 11:49:15	f	f	f	2026-09-08 09:22:40.043
cmtsgoc87002xy4g5wgbot9ax	cmtsgoc80002vy4g5sebz4w09	cmtrr5oa8000020g5zpr8enij	<YT1ftsygQKS8eRI-C_D2nQ@geopod-ismtpd-64>	\N	\N	{}	ENTRANT	no-reply-rf_vxfiuf4lhjvrtxogvrw@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 12:37:13	\N	2026-08-11 12:37:13	f	f	f	2026-09-08 09:22:40.231
cmtsgocdg0031y4g58drpuhm1	cmtsgocd9002zy4g5sadj4hh5	cmtrr5oa8000020g5zpr8enij	<uo9a200dThu4EuOht7Axgw@geopod-ismtpd-59>	\N	\N	{}	ENTRANT	no-reply-nzvw0xa_iv8o9b3b12lv-a@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 12:37:20	\N	2026-08-11 12:37:20	f	f	f	2026-09-08 09:22:40.42
cmtsgocip0035y4g5w2jopt9i	cmtsgocij0033y4g5nz5cvmya	cmtrr5oa8000020g5zpr8enij	<r9R2gS7rTemy2eITtlEmQA@geopod-ismtpd-22>	\N	\N	{}	ENTRANT	no-reply-brfo5imx69igrofh4ugnua@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 12:45:27	\N	2026-08-11 12:45:27	f	f	f	2026-09-08 09:22:40.609
cmtsgocnm0039y4g5giq2ad0g	cmtsgocne0037y4g5jie9rcwi	cmtrr5oa8000020g5zpr8enij	<XchqH5IVTi2F_guWxTQO9g@geopod-ismtpd-22>	\N	\N	{}	ENTRANT	no-reply-8t3reknssffaltjwfadftq@mail.anthropic.com	{dec@samko.group}	{}	Security alert: new trusted device added to your Claude account	\N	2026-08-11 12:46:06	f	f	f	2026-09-08 09:22:40.786
cmtsgocsi003dy4g5a5fmjml2	cmtsgocsb003by4g54pv0m36r	cmtrr5oa8000020g5zpr8enij	<R9cYTg3PT0S5q6Pc_nb0fg@geopod-ismtpd-52>	\N	\N	{}	ENTRANT	no-reply-gitqovv6evfzjal-fhzira@mail.anthropic.com	{dec@samko.group}	{}	Security alert: new passkey added to your Claude account	\N	2026-08-11 12:46:30	f	f	f	2026-09-08 09:22:40.962
cmtsgod1y003hy4g5uizx00tn	cmtsgod1p003fy4g5l8pb2dxb	cmtrr5oa8000020g5zpr8enij	<EvH6TfF7TDqlzQVct1TVEg@geopod-ismtpd-56>	\N	\N	{}	ENTRANT	no-reply-ycu-afsefjgc91-1txopkq@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 14:57:18	\N	2026-08-11 14:57:18	f	f	f	2026-09-08 09:22:41.302
cmtsgodab003ly4g5n2ho5gpy	cmtsgod9y003jy4g5qkwtv9q8	cmtrr5oa8000020g5zpr8enij	<8nKj9eE7SIWZfrK8BwKN-g@geopod-ismtpd-57>	\N	\N	{}	ENTRANT	no-reply-j6ondfhmonnllkmultma_q@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-11 21:42:45	\N	2026-08-11 21:42:45	f	f	f	2026-09-08 09:22:41.603
cmtrb23ou000m04g5125rizl8	cmtrb23hw000l04g57uj226l1	cmtrb23a9000a04g5k7c2tjsx	<demo-1@transit-sahel.example>	\N	\N	{}	ENTRANT	ops@transit-sahel.example	{administration@exemple-mining.ml}	{}	Mainlevée conteneur MSKU 4471 bloqué au port	Le conteneur de pièces de rechange est immobilisé depuis jeudi, nous attendons votre pouvoir…	2026-09-02 10:24:00	t	f	f	2026-09-07 13:57:38.478
cmtrb23rh000q04g5tb94q8kl	cmtrb23r7000p04g5dwhra62p	cmtrb23a9000a04g5k7c2tjsx	<demo-2@impots.example>	\N	\N	{}	ENTRANT	controle@impots.example	{administration@exemple-mining.ml}	{}	Avis de vérification de comptabilité, exercices 2024 et 2025	Nous vous informons qu'une vérification de comptabilité sera engagée à compter du…	2026-08-30 10:24:00	t	f	f	2026-09-07 13:57:38.573
cmtrb23sh000u04g5m6k4gvgm	cmtrb23sb000t04g5d4up9gy7	cmtrb23a9000a04g5k7c2tjsx	<demo-3@douanes.example>	\N	\N	{}	ENTRANT	bureau.kayes@douanes.example	{administration@exemple-mining.ml}	{}	Régularisation déclaration en détail n° 2026-0884	Il subsiste un écart entre la valeur déclarée et la facture fournisseur jointe…	2026-09-03 10:24:00	t	f	f	2026-09-07 13:57:38.609
cmtrb23tp000x04g5fetby71c	cmtrb23td000w04g5nkqkl1r1	cmtrb23a9000a04g5k7c2tjsx	<demo-4@sahel-equipements.example>	\N	\N	{}	ENTRANT	commercial@sahel-equipements.example	{administration@exemple-mining.ml}	{}	Panne compresseur atelier 2, devis de réparation	Suite à notre intervention de vendredi, veuillez trouver le devis de remise en état…	2026-09-04 10:24:00	t	f	f	2026-09-07 13:57:38.653
cmtrb23ul001004g5cbrua09q	cmtrb23ua000z04g5180m4y5p	cmtrb23a9000a04g5k7c2tjsx	<demo-5@foragex.example>	\N	\N	{}	ENTRANT	ventes@foragex.example	{administration@exemple-mining.ml}	{}	Proposition de contrat cadre, forage et sondage 2027	Comme convenu lors de notre échange, voici notre proposition de contrat cadre…	2026-09-06 10:24:00	t	f	f	2026-09-07 13:57:38.685
cmtrb23vo001204g53j74tox9	cmtrb23v9001104g5ixlv9erv	cmtrb23a9000a04g5k7c2tjsx	<demo-6@carbura.example>	\N	\N	{}	ENTRANT	logistique@carbura.example	{administration@exemple-mining.ml}	{}	Programme de livraison gasoil, semaine 38	Merci de confirmer les volumes et les créneaux de déchargement pour la semaine prochaine…	2026-09-06 14:24:00	f	f	f	2026-09-07 13:57:38.724
cmtrb23xe001404g5hnl9z2ga	cmtrb23wh001304g5k77we3z4	cmtrb23a9000a04g5k7c2tjsx	<demo-7@labo-analyse.example>	\N	\N	{}	ENTRANT	resultats@labo-analyse.example	{administration@exemple-mining.ml}	{}	Résultats d'analyses, campagne d'août	Les résultats de la campagne du mois d'août sont disponibles, un point vous est proposé…	2026-09-05 10:24:00	t	f	f	2026-09-07 13:57:38.786
cmtrb23y2001604g5q3xhcbqe	cmtrb23xw001504g5nqhuph65	cmtrb23a9000a04g5k7c2tjsx	<demo-8@mutuelle-pro.example>	\N	\N	{}	ENTRANT	sinistres@mutuelle-pro.example	{administration@exemple-mining.ml}	{}	Déclaration de sinistre véhicule de service, suite	Nous accusons réception de votre déclaration et sollicitons deux pièces complémentaires…	2026-09-05 10:24:00	f	f	f	2026-09-07 13:57:38.81
cmtrb23yv001804g5tcj9xjse	cmtrb23yh001704g5kjlzolmu	cmtrb23a9000a04g5k7c2tjsx	<demo-9@energie-sud.example>	\N	\N	{}	ENTRANT	facturation@energie-sud.example	{administration@exemple-mining.ml}	{}	Révision tarifaire du poste de livraison haute tension	À compter du prochain trimestre, la grille applicable au poste de livraison évolue…	2026-09-04 10:24:00	t	f	f	2026-09-07 13:57:38.839
cmtrb23zo001a04g5v8p6dei1	cmtrb23zd001904g59cyl5atc	cmtrb23a9000a04g5k7c2tjsx	<demo-10@geoconseil.example>	\N	\N	{}	ENTRANT	contact@geoconseil.example	{administration@exemple-mining.ml}	{}	Demande de rendez-vous, présentation de nos services d'ingénierie	Notre cabinet accompagne les opérateurs miniers de la sous-région et souhaiterait…	2026-09-07 08:24:00	f	f	f	2026-09-07 13:57:38.868
cmtrb240b001c04g5l6med5r1	cmtrb2400001b04g52crh2evj	cmtrb23a9000a04g5k7c2tjsx	<demo-11@sahel-equipements.example>	\N	\N	{}	ENTRANT	commercial@sahel-equipements.example	{administration@exemple-mining.ml}	{}	Relance facture FA-2026-1187	Sauf erreur de notre part, la facture ci-dessous demeure impayée à ce jour…	2026-09-07 06:24:00	t	f	f	2026-09-07 13:57:38.891
cmtrb240q001e04g5dmzv4wug	cmtrb240h001d04g5aua0ffc7	cmtrb23a9000a04g5k7c2tjsx	<demo-12@transit-sahel.example>	\N	\N	{}	ENTRANT	ops@transit-sahel.example	{administration@exemple-mining.ml}	{}	Nouvelle grille de fret depuis Dakar	Veuillez trouver notre grille tarifaire révisée applicable au 1er octobre…	2026-09-07 04:24:00	t	f	f	2026-09-07 13:57:38.906
cmtrb241e001g04g544i4tumm	cmtrb2418001f04g52d1kf34g	cmtrb23a9000a04g5k7c2tjsx	<demo-13@foragex.example>	\N	\N	{}	ENTRANT	ventes@foragex.example	{administration@exemple-mining.ml}	{}	Confirmation de commande, pièces d'usure concasseur	Nous accusons réception de votre bon de commande n° BC-2026-0442…	2026-09-03 10:24:00	f	f	f	2026-09-07 13:57:38.93
cmtrb242b001j04g5l991laac	cmtrb2423001i04g5h7rkp7fo	cmtrb23a9000a04g5k7c2tjsx	<demo-14@impots.example>	\N	\N	{}	ENTRANT	controle@impots.example	{administration@exemple-mining.ml}	{}	Attestation de régularité fiscale, renouvellement	Votre demande d'attestation a été instruite, le document est disponible…	2026-09-01 10:24:00	f	f	f	2026-09-07 13:57:38.963
cmtrb242s001l04g5hbbtsopn	cmtrb242n001k04g5i5kpdv2b	cmtrb23a9000a04g5k7c2tjsx	<demo-15@sahel-equipements.example>	\N	\N	{}	ENTRANT	commercial@sahel-equipements.example	{administration@exemple-mining.ml}	{}	Planning d'intervention groupe électrogène de secours	Notre technicien peut intervenir mercredi ou jeudi, merci de nous indiquer…	2026-09-04 10:24:00	f	f	f	2026-09-07 13:57:38.98
cmtrb2437001n04g5j52i7j79	cmtrb2432001m04g5kvjtqisg	cmtrb23a9000a04g5k7c2tjsx	<demo-16@transit-sahel.example>	\N	\N	{}	ENTRANT	ops@transit-sahel.example	{administration@exemple-mining.ml}	{}	Avenant au contrat de transport, clause de carburant	Comme discuté, voici l'avenant intégrant la clause d'indexation carburant…	2026-08-31 10:24:00	t	f	f	2026-09-07 13:57:38.995
cmtsgodkz003py4g5od93wv8n	cmtsgodks003ny4g57hptcv1r	cmtrr5oa8000020g5zpr8enij	<-raIQtm4Te6TyJ4bqPeqrA@geopod-ismtpd-50>	\N	\N	{}	ENTRANT	no-reply-gzbanido1_zx-vripj6otq@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-12 17:29:35	\N	2026-08-12 17:29:36	f	f	f	2026-09-08 09:22:41.987
cmtsgoecq003xy4g5ww9swdv6	cmtsgoebk003vy4g5ym4m5h68	cmtrr5oa8000020g5zpr8enij	<AS2PR08MB8454A2E0BBEEBC088129FD42F5DA2@AS2PR08MB8454.eurprd08.prod.outlook.com>	\N	<AS2PR08MB8454A30910A67F7B8FD79FEBF5DA2@AS2PR08MB8454.eurprd08.prod.outlook.com>	{<AS2PR08MB8454A30910A67F7B8FD79FEBF5DA2@AS2PR08MB8454.eurprd08.prod.outlook.com>}	ENTRANT	courrier.sgccga@finances.ml	{reseauniako_kayes@yahoo.fr,rubentera@yahoo.fr,s.kounta@amifa-ml.net,safim2010@gmail.com,salif.sanogo@cofinacorp.com,sangaoumar@gmail.com,sinsinisomali@yahoo.fr,soudiarra83@gmail.com,ttall@caece-mali.com,yacouba_sam@yahoo.fr,communication@dgimali.ml,diarra_mamary@yahoo.fr,djibrildjene@yahoo.fr,tecnaapprotb@yahoo.fr,airniono1817@gmail.com,akseydou2005@gmail.com,cmtrakieta.mali@gmail.com,cmtrakieta.mali@gmail.com,oba@flyasky.com,911@esf.travel,abdiarra@orangemali.net,almadina@orangemali.net,bamako@geotours.org,govoyagesmali@yahoo.fr,hounaynevoyage@yahoo.fr,lamineyd@yahoo.com,38bani@afribone.net.ml,contact@boni-voyages.com,boni-voyage@yahoo.fr,abdvoyage@gmail.com,abenwahab@yahoo.fr,ablayekansaye@yahoo.com,aboutours@orange.fr,agencelabaika@yahoo.fr,al-bayane@yahoo.fr,aldatravelta@gmail.com,alfirdaouss.ml@gmail.com,alomrabas@yahoo.fr,alzoudiallo@yahoo.fr,arafatvoyages@yahoo.f,aroudeiny@yahoo.fr,sidimoulaye@yahoo.fr,astavoyages@yahoo.fr,atlas-voyages@timbaga.com.ml,atlas-voyage@orangemali.net,attsvoyages@gmail.com,azalaivoyages@nomade.fr,azawadvoy@hotmail.com,baba@infostar-voyage.com,baba@infostar-voyage.com,diawarababa@hotmail.com,badenya2003@yahoo.fr,bambara@bambara.com,btsenfants@yahoo.fr,bdiawara@afribonemali.net,businessvoyagesmali@yahoo.fr,chechtours@spider.tolnet.org,cheick@couleursmali.com,juliette@couleursdumali.com,cherifla_voyages@yahoo.fr,cisse_sandy@yahoo.fr,contact@azurvoyages.com,contact@ebonytraveltours.com,danayavoyages@yahoo.fr,danayavoyages@orangemal.net,delta@deltavoyages.net,info@deltavoyages.net,diabate@erikastours.com,diafounouvoyagesmali@yahoo.fr,diallocmok@yahoo.fr,diaptodji@yahoo.fr,diatiguitravel@hotmail.com,diomberah@yahoo.fr,dousacko@yahoo.fr,safewayvoyages@gmail.com,ewedjevtmali@yahoo.fr,f.kamissoko@kanaga-at.com,info@kanaga-at.com,fakala@cefib.com,falatah@hotmail.com,baf-malisa@yahoo.fr,badoulm@yahoo.fr,gabrieleazimut@ikatelnet.net,horizonsvoyages@webmails.com,info@afrik-expeditions.com,info@balanzan-tours.com,info@elkuntitravel.com,info@ethnikamali.com,info@riverside-mali.com,info@terrebozo.com,info@toungatours.com,info@toyatours.com.ml,infos@donkovoyages.com,infos@malimysteresexpreditions.com,infos_coeur-mali@yahoo.fr,ismailazimut@ikatelnet.net,kantelagence@yahoo.fr,kasovoyages@yahoo.fr,keitasalif44@yahoo.fr,kissivoyage@yahoo.fr,koubavoyage@yahoo.fr,kvgs_voyages@yahoo.fr,lafiavoyages@hotmail.fr,diakbaye@hotmail.fr,laguinna@afribone.net.ml,madouashrafmopti@yahoo.fr,magadatours@orangemali.net,mali@continenttours.com,mali_aventures@yahoo.fr,info@mali-aventures.com,malinterservices@mail.com,malitraveltours@orangemali.net,mambysissoko@hotmail.com,minavoyages@yahoo.fr,mondialvoyages4@yahoo.fr,mpv@amadeusmali.com,mtraore@wanitour.org,nailivoyages@yahoo.fr,nomade@cefib.com,oriental.mali@africamail.com,oumsangvoyage@gmail.com,peulvoyages@yahoo.fr,saaaam@afribone.net.ml,sagatours@sagatours.com,saheltours@yahoo.fr,samivoyages92@yahoo.fr,samisarl@ikaso.net,sangha_voyages@hotmail.com,sankore_voyages@yahoo.fr,sankore_voyages@yahoo.fr,sonfatouvoyages@yahoo.fr,sultanhilal@afribone.net.ml,tafoukvoyages@yahoo.fr,tamadoumanvoyages@yahoo.fr,tamvoyages@cefib.com,taphavoyages@hotmail.com,tara@afribonemali.net,tbt@cefib.com,tellemvoyages@afribonemali.net,tellemvoyage@yahoo.fr,temeauguste@hotmail.com,teriyavoyages@yahoo.fr,thirissorovoyages@yahoo.fr,tilleuls@afribone.net.ml,togunaadventure@afribone.net.ml,twtmali@yahoo.fr,westair@afribone.net.ml,yannisafricatours@yahoo.fr,yeelentours.mali@orange.fr,ykangaye@yahoo.fr,ysooufditgole@hotmail.com,zorome@ztravelmali.com,zzamzam10@yahoo.fr,abdfaskoye@yahoo.fr,complexedoumbia@yahoo.fr,cpmoussatraore@gmail.com,oumarab91@gmail.com,sgslmali66@gmail.com,tembelyyaiguerefifi@outlook.fr,toureabdoulkadri@gmail.com,ykonesenoufo@yahoo.fr,mamtoure@anglogoldashanti.com,sdi4@dgi.gouv.ml,ursular@somisy.com,kassoums@somisy.com,aichac@somisy.com,daouda.dicko@bme.co.za,ousmane.cisse@bme.co.za,asseyidou.maiga@bme.co.za,madani.ba@bme.co.za,bayaya.ballo@manutafmali.com,abdoulaye.diallo@sgs.com,hamza.bocoum@sgs.com,coulibaly.oumar@sgs.com,aminata.diarra@manutafmali.com,mohamed.diallo@manutafmali.com,diarrah.mamadou@fluiconnecto.ml,mohamedaziz.kone@gmail.com,symahamane02@gmail.com,broulaye.bayoko@faboulagold.com,abdoulayez.traore@faboulagold.com,zdao@hotmail.com,kalil.sekoud@barrick.com,mamadou.t28@yahoo.com,ibrakanout@yahooo.fr,mcoulibaly@dsgcontracting.com,bagayokoadama@hotmail.com,mobalde@dsgcontracting.com,drissa.sogodogo@sandvik.com,thiemoko.traore@sandvik.com,hamsa.nouhoum@sandvik.com,ikanade@edv.ops.com,ikanade@edv.cps.com,mamarysogodogo@yahoo.fr,ambroise.diallo@atos.net,bdiarra@etasimali.com,sekoukonate@hotmail.fr,kolocamara075@gmail.com,oballo@firefinchltd.com,ousmane.sangare@epiroc.com,comptabilite@imagri-ml.com,bathtravauxsa10@gmail.com,stefanie@paragontailings.com,tieoulejane@yahoo.fr,mamadou.sow@alsglobal.com,hadily@teliman.net,sfofana@okloresources.com,ambaye@mcgaudit.net,mlgoita@tsebo.com,amaiga@okloresourcesmali.com,sipexmalibranch@yahoo.fr,mbayemo2209@gmail.com,konate.georges@gmail.com,aztraore01@gmail.com,bayokobroulaye3@gmail.com,dembelehl@gmail.com,asimpara@afrilogmali.com,missack_kone@iamgold.com,ibrahim_daou@iamgold.com,nico.vanwoudenberg@alsglobal.com,soumare.mariam@socarco.com,saidoudiallo16@gmail.com,diabygss@yahoo.fr,mdiabate@firefinchltd.com,diallo.ibrahima@dsgcontracting.com,nimagabouya@gmail.com,acoulibalygy1@gmail.com,aboubacar.sacko@cevalogistics.com,amadounantoume@yahoo.fr,amaiga@okloresourcesmali.com,emeric.hamon@ultimgroup.com,nkoumare@coragaold.com,traoreoumar3114@gmail.com,fantamining1@gmail.com,diarraeder@gmail.com,bballo@etef-mali.com,allatra1987@gmail.com,mlgoita@tsebo.com,nzel70@yahoo.fr,adiallo@junctionmining.com,sidielwafik@gmail.com,wanama.tolo@manutafmali.com,sogodogomamary47@gmail.com,siby@marenagoldmali.com,sibyfodie428@gmail.com,sangalag@gmail.com,m.diarra@groupeprestige-mali.com,atounkara26@gmail.com,abdelkadercoulibaly10@gmail.com,baidy.diarra7489@gmail.com,ousmanesyballo@gmail.com,abdoulaziz0017@gmail.com,muhasebesomaca@gmail.com,pmgco2022@gmail.com,hamed.ndiaye@manutafmali.com,djaliba@omamali.com,oumar.ly@pimco-africa.com,soumaorous@gmail.com,almoustaphdiallo@gmail.com,hamatoure@yahoo.fr,sangouss@gmail.com,drissasogodogo01@gmail.com,dembele@gmail.com,olivier.mouly@umo-interim.com,papebaba.diop@dpworld.com,ibrahima.sissoko@dsgcontracting.com,mohamed.serre@dsgcontracting.com,mocoulibaly@somisy.com,diakalias@somisy.com,wuramansa.holding@gmail.com,fkone@alliedgold.com,wanama.tolo@neemba.com,konateabdoulmadjid15@gmail.com,mamadou.moussa52@gmail.com,msgeo.consult@gmail.com,tourebourama@gmail.com,mtourebourama@gmail.com,tourebourama@gmail.com,tourebourama@gmail.co,ssidibe@anglogoldashanti.com,moussat@somisy.com,moussat@somisy.com,moussat@somisy.com,l.yalcouye@egccinternational.com,l.yalcouye@egccinternational.com,m.diallo@robexgold.com,m.diallo@robexgold.com,m.tessougue@robexgold.com,m.tessougue@robexgold.com,sory.sidibe@b2gold.com,sory.sidibe@b2gold.com,sory.sidibe@b2gold.com,sory.sidibe@b2gold.com,sory.sidibe@b2gold.com,sory.sidibe@b2gold.com,sory.sidibe@b2gold.com,idrissa.b@hummingbirdresources.ml,idrissa.b@hummingbirdresources.ml,symahamane@yahoo.fr,symahamane@yahoo.fr,zanai.bamba@alt-mali.com,habiboulaye.diallo@barrick.com,habiboulaye.diallo@barrick.com,kagnassy.moussa@barrick.com,ssidibe@sadiolamine.com,d.diarha@saficonseils.com,d.diarha@saficonseils.com,d.diarha@saficonseils.com,azizanenadia@gmail.com,binef@groupetoguna.com,samake@groupetoguna.com,amaiga@mgm-mining-mali.com,amaiga@mgm-mining-mali.com,ibrahim.kanoute@endeavourmining.com,ibrahim.kanoute@endeavourmining.com,ibrahim.kanoute@endeavourmining.com,cbdrame@gmail.com,kolocamara075@gmail.com,declarations@pyramis-ac.com,declarations@pyramis-ac.com,atconseilsarl@gmail.com,atconseilsarl@gmail.com,atconseilsarl@gmail.com,ousmanebcoulibaly9@gmail.com,bmarico@sec-exafi.com,atoure@sec-exafi.com,atoure@sec-exafi.com,mkoita@sec-exafi.com,mkoita@sec-exafi.com,gakoumomo89@gmail.com,gakoumomo89@gmail.com,i.thiero@egccinternational.com,i.thiero@egccinternational.com,i.thiero@egccinternational.com,ousco30@yahoo.fr,diasid2003@yahoo.fr,codembele@gmail.com,sbocoum@sec-exafi.com,sbocoum@sec-exafi.com,cabinetcyd@gmail.com,cecof2021@gmail.com,karamokodiabateniaf84@gmail.com,foussenitraore84@gmail.com,fatoumacki@gmail.com,karamokodiak84@gmail.com,moctarkouma@yahoo.fr,moctarkouma@yahoo.fr,tabaradia7560@gmail.com,tabaradia7560@gmail.com,tabaradia7560@gmail.com,tabaradia7560@gmail.com,sissoko_kadia@yahoo.fr,sissoko_kadia@yahoo.fr,sissoko_kadia@yahoo.fr,sissoko_kadia@yahoo.fr,m.kouma@gmiaudit.net,makadjimamoudou@yahoo.fr,e-impot@juridtax.com,e-impot@juridtax.com,yayahdiallocomptablecabinetcyd@gmail.com,cabsallmali@gmail.com,g.traore@satispartners.com,comptabilite@imagri-ml.com,konecheickboukadry@gmail.com,e.impots@satispartners.com,nakoukoumare@gmail.com,d.dembele@convergences-audit.com,d.dembele@convergences-audit.com,khalidoutraore1@gmail.com,zakariazaki8511@yahoo.com,zakariazaki8511@yahoo.com,zakariazaki8511@yahoo.com,zakariazaki8511@yahoo.com,fcoulibaly3004@gmail.com,fcoulibaly3004@gmail.com,fcoulibaly3004@gmail.com,fcoulibaly3004@gmail.com,yacouba.goita@contango-holdings-plc.co.uk,soumaorous@gmail.com,hamadountoure75@gmail.com,foussenitraore84@gmail.com,mohamedf.samake@alt-mali.com,csnounawon@sec-exafi.com,csnounawon@sec-exafi.com,symahamane03@gmail.com,symahamane03@gmail.com,diarhadiallo1@gmail.com,diarhadiallo1@gmail.com,diarhadiallo1@gmail.com,ousco90@gmail.com,kadifine@gmail.com,kadifine@gmail.com,kadifine@gmail.com,kadifine@gmail.com,sisidibe@alliedgold.com,koumamoctar2019@gmail.com,koumamoctar2019@gmail.com,moussagmt342@gmail.com,moussagmt342@gmail.com,moussagmt342@gmail.com,symahamane02@gmail.com,symahamane02@gmail.com,symahamane02@gmail.com,salomonleroi19@gmail.com,zakariatraore249@gmail.com,zakariatraore249@gmail.com,zakariatraore249@gmail.com,zakariatraore249@gmail.com,awaniogotra@gmail.com,traoreoumar3114@gmail.com,berthebakary606@gmail.com,cbdrame@gmail.com,ousmanesyballo@gmail.com,diarhadiallo1@gmail.com,diarhadiallo1@gmail.com,diarhadiallo1@gmail.com,cabinetsaouconseil@gmail.com,mohaconseil@yahoo.fr,mamadoudiawara7592@gmail.com,a.tolo@robexgold.com,abdoulaye.traore@endeavourmining.com,soumaorous@gmail.com,soumaorous@gmail.com,ibkanoute@segalamining.com,ibkanoute@segalamining.com,mdienta@alliedgold.com,info@samko-conseil.com,scisse@alliedgold.com,msylla@syllaassocies.com,asidibe@syllaassocies.com,moussak1@somisy.com,moussak1@somisy.com,coulby16@yahoo.com,coulby16@yahoo.com,fkone@alliedgold.com,medmobah@gmail.com,medmobah@gmail.com,wanama.tolo@neemba.com,wanama.tolo@neemba.com,diakalias@somisy.com,diakalias@somisy.com,dec@samko.group,belco@groupetoguna.com,sam@diarrasec.com,sareci@orangemali.net,mariemebah@orangemali.net,sommariam@yahoo.fr,inauditsarl2008@yahoo.fr,sekoukonate80@yahoo.fr,secretariat@sectoure.com,abdtoure@sectoure.com,ecretariat@konimali.com,ksidibe@konimali.com,sfaty@konimali.com,drav@yahoo.fr,iaemali@crowe.ml,ymskone@yahoo.fr,bkante@ae2cmali.com,kanteboubacars@yahoo.fr,abdoulayekouma@hotmail.com,mamadoudramanesangare@gmail.com,cffao.sylla@gmail.com,z_ndiaye@yahoo.fr,zeina@panaudit-mali.org,drame@diarrasec.com,alioukeita33b@yahoo.fr,almouner@afriqueauditconseil.com,asangare@sangarea.com,ibrahimtounkara@itmconseils.com,alasset@iecconseil.org,satex_mali@yahoo.fr,cissekalilou21@hotmailcom,kcisse@auditecfiduciaire.com,atoure@sec-exafi.com,abtoure@gmail.com,sominedolo@gmail.com,awa_sama@yahoo.fr,sagec.sec@gmail.com,tambadouf@yahoo.fr,contact@pyramis-ac.com,s.sawadogo@convergences-audit.com,convergences@convergences-audit.com,msamake2001@yahoo.fr,idrtourediak@yahoo.fr,mtibatounk@yahoo.fr,awarouge@yahoo.fr,guindo@cabinetcao.com,diakite39@yahoo.fr,infovan@vanconseil.com,sanogo.expertcomptable@gmail.com,cdiawara@vanconseil.com,antoinezerbo@zconseils-audit.com,koumakadi@yahoo.fr,sanounou@diarrasec.com,sila@diarrasec.com,ml@kanagaconsulting.com,sidimdiop@yahoo.fr,btraore@cecafi.org,e.traore@izeha.fr,mbmdsaf@gmail.com,mahamadoum.kamissoko@cmafinternational.com,mamadoub.diallo@cmafinternational.com,djibril.wélé.diallo@pyramis-ac.com,fsissoko@ae2cmali.com,nly@lynconsult.org,aliou.diawara@cmafinternational.com,diawaraaliou@gmail.com,mgoita@zconseils-audit.com,aouliland@gmail.com,missa.kone@ci.gt.com,eac_mali@yahoo.com,seydou.zerbo@pyramis-ac.com,acefi.expert@gmail.com,inzakonate2000@yahoo.fr,info@samko-conseil.com,atraore@gecaf.info,hamidou.dicko@gmail.com,b.sanou@sanec.fr,annoudicko@afrimacmali.com,mdienta@advisis.co,mbadienta@gmail.com}	{}	Mise a jour de la liste des sanctions financières ciblées des Nations Unies 13/08/2026	\N	2026-08-14 08:33:22	f	f	f	2026-09-08 09:22:42.986
cmtrb2446001r04g5gwqlf8ha	cmtrb2440001q04g5rlflow4w	cmtrb23a9000a04g5k7c2tjsx	<demo-17@sahel-equipements.example>	\N	\N	{}	ENTRANT	commercial@sahel-equipements.example	{administration@exemple-mining.ml}	{}	Procès-verbal de réception, station de pompage	Veuillez trouver le procès-verbal signé des deux parties…	2026-08-14 10:24:00	t	f	f	2026-09-07 13:57:39.03
cmtrb2450001t04g5gd88ck0k	cmtrb244v001s04g5tw30to96	cmtrb23a9000a04g5k7c2tjsx	<demo-18@douanes.example>	\N	\N	{}	ENTRANT	bureau.kayes@douanes.example	{administration@exemple-mining.ml}	{}	Quitus douanier campagne d'importation 2025	Le quitus vous est délivré au titre des opérations de l'exercice écoulé…	2026-08-07 10:24:00	t	f	f	2026-09-07 13:57:39.06
cmtrb245w001w04g5m0sn78ex	cmtrb245k001v04g5m6789msx	cmtrb23a9000a04g5k7c2tjsx	<demo-19@mutuelle-pro.example>	\N	\N	{}	ENTRANT	sinistres@mutuelle-pro.example	{administration@exemple-mining.ml}	{}	Clôture du dossier de sinistre 2026-114	Le dossier est clos, l'indemnisation a été virée sur le compte indiqué…	2026-07-29 10:24:00	f	f	f	2026-09-07 13:57:39.092
cmtrb246u001y04g5jfi092t1	cmtrb246h001x04g5163378km	cmtrb23a9000a04g5k7c2tjsx	<demo-20@geoconseil.example>	\N	\N	{}	ENTRANT	contact@geoconseil.example	{administration@exemple-mining.ml}	{}	Rapport d'audit énergétique du site	Le rapport définitif intègre vos observations du mois dernier…	2026-07-17 10:24:00	t	f	f	2026-09-07 13:57:39.126
cmtrrehka00037gg5996r0z3k	cmtrrehgl00017gg5c6lkpi6n	cmtrr5oa8000020g5zpr8enij	<75959f0c-12ab-0d1d-7c44-019ff6a1111c@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-03 08:21:52	f	f	f	2026-09-07 21:35:10.186
cmtrrekij00067gg5ix4et71j	cmtrrekia00047gg58eak12v9	cmtrr5oa8000020g5zpr8enij	<db70094d-bbaf-1747-33be-6c35c43df2ab@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-03 08:21:52	f	f	f	2026-09-07 21:35:14.011
cmtrremz800097gg54s6b54jz	cmtrremyx00077gg58sd1lvbc	cmtrr5oa8000020g5zpr8enij	<da3b181f-674d-7346-041d-b9f2e848a7db@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-03 08:22:13	f	f	f	2026-09-07 21:35:17.204
cmtrrep4l000d7gg5257o8tyt	cmtrrep3w000b7gg5x9obo8vt	cmtrr5oa8000020g5zpr8enij	<AM8P193MB1106762EF4E58EF7105FF6F0F1B62@AM8P193MB1106.EURP193.PROD.OUTLOOK.COM>	\N	<AM8P193MB11066ABC9BC3DD633217F548F1C32@AM8P193MB1106.EURP193.PROD.OUTLOOK.COM>	{<AM8P193MB11061F92CA04C44AB3EEE3C9F1ED2@AM8P193MB1106.EURP193.PROD.OUTLOOK.COM>,<DBAPR03MB65022C84223B06F08E741E68EFF62@DBAPR03MB6502.eurprd03.prod.outlook.com>,<VI1P193MB0608EC9AB5BEE3E9CCBF3F65F0F62@VI1P193MB0608.EURP193.PROD.OUTLOOK.COM>,<4bda7f5e-8f35-4d16-aa96-6fbeccb18a1b@proman.lu>,<AM8P193MB11067E8D79B459D6910A1551F1F92@AM8P193MB1106.EURP193.PROD.OUTLOOK.COM>,<VI1P193MB060825B2A43B206E99ECCFD7F0F92@VI1P193MB0608.EURP193.PROD.OUTLOOK.COM>,<VI1P193MB0608FE2B5B7037DE9D888EA6F0F92@VI1P193MB0608.EURP193.PROD.OUTLOOK.COM>,<a56f8714-7e5c-4db3-bc65-0781e29f61ec@proman.lu>,<508c0953-5551-4d78-89ff-c024f70db623@proman.lu>,<AM8P193MB11068D3C968544B57DCC7CCDF1C62@AM8P193MB1106.EURP193.PROD.OUTLOOK.COM>,<AM0P193MB05959127D53C663175766DD2F0C32@AM0P193MB0595.EURP193.PROD.OUTLOOK.COM>,<AM8P193MB11066ABC9BC3DD633217F548F1C32@AM8P193MB1106.EURP193.PROD.OUTLOOK.COM>}	ENTRANT	bsissoko@proman-project.com	{stangara@samko.group,msamake@samko-conseil.com,tangaseydou@gmail.com}	{ckayitesi@proman-project.com,dsissoko@samko.group,dec@samko.group}	RE: Demande d'accès Odoo pour un nouveau collaborateur	\N	2026-09-03 11:12:08	f	f	f	2026-09-07 21:35:19.989
cmtrrers2000g7gg56v3xo26v	cmtrrerri000e7gg5kcbczxkv	cmtrr5oa8000020g5zpr8enij	<9440314b-8996-dc24-972b-5df8efbabf88@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-03 11:13:51	f	f	f	2026-09-07 21:35:23.426
cmtrrev4l000j7gg5l233jd5c	cmtrrev41000h7gg5pz5mbfwy	cmtrr5oa8000020g5zpr8enij	<d8a2a701-96b8-d201-6a00-03de37837c46@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-03 11:15:11	f	f	f	2026-09-07 21:35:27.765
cmtrrexzb000m7gg5fyezjd6c	cmtrrexyq000k7gg5fion4por	cmtrr5oa8000020g5zpr8enij	<09489416-5e84-ef6b-b356-57639560dba2@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-07 13:13:44	f	f	f	2026-09-07 21:35:31.463
cmtrrf0ib000p7gg5tohv9zjx	cmtrrf0hv000n7gg5wju6b06i	cmtrr5oa8000020g5zpr8enij	<187dcc50-c203-ee02-e21f-c78a4e1d3480@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-07 13:14:43	f	f	f	2026-09-07 21:35:34.739
cmtrrf3ic000s7gg5a5rzwhrv	cmtrrf3ht000q7gg5rgb7h7im	cmtrr5oa8000020g5zpr8enij	<2625ed9d-47a6-8348-b0d8-620add603988@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-07 13:15:44	f	f	f	2026-09-07 21:35:38.628
cmtrrf6l6000v7gg5d26h9ddd	cmtrrf6kk000t7gg5u55w0fxz	cmtrr5oa8000020g5zpr8enij	<5c5914ed-3cda-f694-1c35-fed603e9935f@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-07 13:30:43	f	f	f	2026-09-07 21:35:42.618
cmtrrf8xk000y7gg58tav7ec8	cmtrrf8x8000w7gg5sncdibo2	cmtrr5oa8000020g5zpr8enij	<1b6dd2df-62ab-ba8c-1b6d-64659c34beee@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-07 13:32:44	f	f	f	2026-09-07 21:35:45.656
cmtrrfbbu00117gg5e3eocfqc	cmtrrfbbm000z7gg5btt0mkpo	cmtrr5oa8000020g5zpr8enij	<d69ac402-dd6f-5ef9-d06f-d4221fa83409@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-07 13:34:23	f	f	f	2026-09-07 21:35:48.764
cmtrrfdng00157gg5i7te6flc	cmtrrfdn400137gg55rf4lfit	cmtrr5oa8000020g5zpr8enij	<357589470913921.1788809550.061617612838745-openerp-11-res.users@eu736a.odoo.com>	\N	\N	{}	ENTRANT	catchall@orpheus.odoo.com	{dec@samko.group}	{}	Soumailou SAMAKE de ORPHEUS DREAM VILLAGE HOTEL vous invite à vous connecter à Odoo	\N	2026-09-07 19:32:30	f	f	f	2026-09-07 21:35:51.772
cmtsgodwo003ty4g53xfblxdn	cmtsgodwd003ry4g50ov00o56	cmtrr5oa8000020g5zpr8enij	<063482523797675.1786621114.192906856536865-openerp-6879861-sale.order@of44.odoo.com>	\N	\N	{<292029687077813.1766052299.422146320343018-openerp-6879861-sale.order@of34.odoo.com>,<393103843999442.1782717069.412199735641479-openerp-6879861-sale.order@of42.odoo.com>,<DBAPR03MB65027A339939991964D250D3EFF62@DBAPR03MB6502.eurprd03.prod.outlook.com>,<063482523797675.1786621114.192906856536865-openerp-6879861-sale.order@of44.odoo.com>}	ENTRANT	bober@odoo.com	{dec@samko.group,sas@samko-academy.com}	{}	RE: Votre Gestionnaire de Compte Odoo	\N	2026-08-13 11:38:34	f	f	f	2026-09-08 09:22:42.408
cmtsgoenb0040y4g5396gw1q9	cmtsgoen0003yy4g5wyanze9i	cmtrr5oa8000020g5zpr8enij	<72e16a5e-d728-0ecf-d6e5-4251aff25983@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-14 11:25:16	f	f	f	2026-09-08 09:22:43.367
cmtsgoexb0043y4g5yuh2gckq	cmtsgoewx0041y4g57zq8vadx	cmtrr5oa8000020g5zpr8enij	<b0bfce7f-7fe7-081c-452d-6050d08a6fb7@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-14 11:25:36	f	f	f	2026-09-08 09:22:43.727
cmtsgof6q0046y4g5bi0305hx	cmtsgof5x0044y4g5cpswnx1h	cmtrr5oa8000020g5zpr8enij	<85ba727d-039c-9923-9a78-85e36c7b23a7@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-14 11:25:56	f	f	f	2026-09-08 09:22:44.066
cmtsgofh70049y4g5zo86xx10	cmtsgofgo0047y4g5szcewaov	cmtrr5oa8000020g5zpr8enij	<8efdcdc7-b529-4748-15d9-044b861a6978@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-14 11:26:18	f	f	f	2026-09-08 09:22:44.443
cmtsgoful004cy4g5l5p05qph	cmtsgofu5004ay4g5hdd3rvxy	cmtrr5oa8000020g5zpr8enij	<77987af7-cae0-0098-53d5-479be8208ed5@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-14 15:36:16	f	f	f	2026-09-08 09:22:44.925
cmtsgogag004fy4g59jwyo48q	cmtsgoga6004dy4g5m91sslcc	cmtrr5oa8000020g5zpr8enij	<438df99e-d1cb-88b7-e421-2da435876690@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-14 17:05:46	f	f	f	2026-09-08 09:22:45.496
cmtsgogol004iy4g5u1snmsfv	cmtsgogo7004gy4g5widtu34d	cmtrr5oa8000020g5zpr8enij	<f86307e1-cdf7-c3fa-e878-7dd0637d4417@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-17 09:51:06	f	f	f	2026-09-08 09:22:46.005
cmtsgoh1l004ly4g5ndbusjx1	cmtsgoh17004jy4g57156xepl	cmtrr5oa8000020g5zpr8enij	<f47504b3-5912-50d8-1e60-826e763d4428@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-17 10:35:26	f	f	f	2026-09-08 09:22:46.473
cmtsgohck004oy4g50jchy1p3	cmtsgohc9004my4g57fmr5v9q	cmtrr5oa8000020g5zpr8enij	<595645e7-d296-e3ef-9dfa-82db42eebeba@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-17 10:35:26	f	f	f	2026-09-08 09:22:46.868
cmtsgohmk004ry4g5m9kvm4bh	cmtsgohm5004py4g5tvc42ntd	cmtrr5oa8000020g5zpr8enij	<1cb9fc14-33e6-2463-c752-210db9215d1d@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-17 10:57:27	f	f	f	2026-09-08 09:22:47.228
cmtsgohsg004vy4g573x9ux5v	cmtsgohs3004ty4g5meanvzxr	cmtrr5oa8000020g5zpr8enij	<TgPIfjVuSbOPfAauoBmbOg@geopod-ismtpd-60>	\N	\N	{}	ENTRANT	no-reply-zl5_py4yj8i8e_vzzb6elw@mail.anthropic.com	{dec@samko.group}	{}	Votre lien sécurisé vers Claude.ai est ici | 2026-08-17 10:58:54	\N	2026-08-17 10:58:54	f	f	f	2026-09-08 09:22:47.44
cmtsgoi1h004zy4g5rgh1wgj3	cmtsgoi0v004xy4g5edx8sum0	cmtrr5oa8000020g5zpr8enij	<AM7PR01MB7138666BA157EEBB9C65475BFEA72@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>	\N	<MM0P280MB01523021473BF196DF57F3ABAEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>	{<DB8PR01MB6011BC30BFA2C3B9EEAF042DE882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<PR3PR03MB65075DC4EC8896580CC52E71EF82A@PR3PR03MB6507.eurprd03.prod.outlook.com>,<DB8PR01MB6011BAD77D868C3A5065C362E882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<DB8PR01MB60110928ED5EE5F0FBD2AFBCE881A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<AM7PR01MB713850E2B576492D192151F0FE81A@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<000a01dc8474$d78877b0$86996710$@samko-academy.com>,<007d01dc8656$ed7353e0$c859fba0$@samko-academy.com>,<DU0PR01MB1006622E634BAF932ACD0C02D8F8BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<PR1P264MB1901A41361150E4A46ED0573F788A@PR1P264MB1901.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB1006691811B3A73FD6FDB58AC8F89A@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB18902D83D6CE4394B713C2C9F789A@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB10066375ADB9EC921FA316FB98F9BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB1890F0CE8FED8BBB436C5004F79BA@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<AM7PR01MB66286E7AA7281E36572780B78FE32@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152A60B7DE030E5F0E11F8CAEEE2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<GVYP280MB0157FDC73734909B531AF116AEFE2@GVYP280MB0157.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB6628F7844C749D0A66C3A6D28FFD2@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152EBE59A0F4B53FD359D53AEDD2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138E5FC4FE110647FF97F14FEDD2@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<MM0P280MB01523021473BF196DF57F3ABAEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>}	ENTRANT	ghislaineflore.tchoudjem@care.org	{sas@samko.group,marcdominique.kuate@care.org,ddiarra@samko.group,saasamake@samko-academy.com,msamake@samko-conseil.com,aguelly@samko-academy.com,bdev@samko.group,mtraore@samko-academy.com,valentinchristian.assonkeng@care.org}	{mtraore@samko.group,christine.batoum@care.org,sas@samko-academy.com,leoniebeatrice.bana@care.org,vanessa.momo@care.org,dec@samko.group}	RE: CONSULTATION SYCEBNL - ETATS FINANCIER 2025 CARE CMR : Première réunion de cadrage	\N	2026-08-17 15:10:05	f	f	f	2026-09-08 09:22:47.765
cmtsgoibv0053y4g5yqiepsem	cmtsgoibf0051y4g5b69jmta2	cmtrr5oa8000020g5zpr8enij	<18d658e9-cfbd-880b-45eb-772b8c15937d@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-18 18:00:59	f	f	f	2026-09-08 09:22:48.139
cmtsgoimz0057y4g5c2yrrcdi	cmtsgoime0055y4g5wo86qqpx	cmtrr5oa8000020g5zpr8enij	<002f01dd2f43$5230d830$f6928890$@orpheusdreamvillage.com>	\N	<MM0P280MB0152CACC452960A088AC80A6AEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>	{<MM0P280MB0152CACC452960A088AC80A6AEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>}	ENTRANT	bekaye.b.samake@orpheusdreamvillage.com	{sas@samko.group}	{assistant.pca@orpheusdreamvillage.com,infoline@orpheusdreamvillage.com,dsissoko@samko.group,dec@samko.group,segal@samko-conseil.com,amdaou@samko-academy.com,msamake@samko-conseil.com}	RE: Rapport mensuel Juillet 2026 - ORPHEUS DREAM VILLAGE HOTEL	\N	2026-08-18 18:56:40	f	f	f	2026-09-08 09:22:48.539
cmtsgoiy7005ay4g5p16rgfb8	cmtsgoixy0058y4g5xrzh9w0f	cmtrr5oa8000020g5zpr8enij	<fd8c48f8-1073-bb8b-dfc9-253704afd235@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 10:48:12	f	f	f	2026-09-08 09:22:48.943
cmtsgoj7z005dy4g5aysq38oj	cmtsgoj7i005by4g53nudad4y	cmtrr5oa8000020g5zpr8enij	<31e46f08-0259-b985-d793-2db93c6ff3bf@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 10:48:32	f	f	f	2026-09-08 09:22:49.295
cmtsgojj3005gy4g5ygcvs6li	cmtsgojih005ey4g5bcsh395t	cmtrr5oa8000020g5zpr8enij	<220d524a-9930-2fdf-a2b5-69bc295d5c35@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 10:48:52	f	f	f	2026-09-08 09:22:49.695
cmtsgojt0005jy4g5vgnkq7ce	cmtsgojss005hy4g543n81men	cmtrr5oa8000020g5zpr8enij	<95a88750-1a2e-7078-b5e5-3520b57a5b81@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 10:50:13	f	f	f	2026-09-08 09:22:50.052
cmtsgok29005my4g5arfz3ffx	cmtsgok1z005ky4g5y1bwph9e	cmtrr5oa8000020g5zpr8enij	<c02eb3ee-4ac4-f82e-205a-0064298b88d7@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 10:50:33	f	f	f	2026-09-08 09:22:50.385
cmtsgokc1005py4g5rjbivpt1	cmtsgokbk005ny4g5fgf1dhz8	cmtrr5oa8000020g5zpr8enij	<6fe5ef5b-d7a9-67d6-c445-54df709177ba@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 10:50:33	f	f	f	2026-09-08 09:22:50.737
cmtsgokly005sy4g5proklzl5	cmtsgoklf005qy4g57pfwoe4i	cmtrr5oa8000020g5zpr8enij	<e58853bd-87e5-8a14-e1ad-a7bf3fb4c76b@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 10:52:53	f	f	f	2026-09-08 09:22:51.094
cmtsgokwd005vy4g5oyc4wohi	cmtsgokvz005ty4g56ymkf1te	cmtrr5oa8000020g5zpr8enij	<ec8f2bc2-8911-a0d7-9ffe-4d5545f1c0f1@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 10:53:13	f	f	f	2026-09-08 09:22:51.469
cmtsgol7b005yy4g5ci8ndotf	cmtsgol74005wy4g50b3axzfw	cmtrr5oa8000020g5zpr8enij	<3d63c9bd-9adf-67c8-cb0b-e8f7635a4064@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 10:53:14	f	f	f	2026-09-08 09:22:51.863
cmtsgolgz0061y4g5wonvkedt	cmtsgolgs005zy4g5nchb02i5	cmtrr5oa8000020g5zpr8enij	<760f6d64-e588-bd52-c391-1206194243ea@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 11:30:53	f	f	f	2026-09-08 09:22:52.211
cmtsgolqh0064y4g5x60anw70	cmtsgolq50062y4g56iitl3w0	cmtrr5oa8000020g5zpr8enij	<98a59848-d19c-42df-fca3-bc23b0a05ebc@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-19 11:31:32	f	f	f	2026-09-08 09:22:52.553
cmtsgom060067y4g52vrqr471	cmtsgolzx0065y4g50uyrdnql	cmtrr5oa8000020g5zpr8enij	<bff12b5c-f6fc-5503-6b0f-dc074b784d04@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-21 10:52:41	f	f	f	2026-09-08 09:22:52.902
cmtsgomaj006ay4g5uk6rxo81	cmtsgomab0068y4g53n6axff9	cmtrr5oa8000020g5zpr8enij	<0093ec0a-e2ea-87e1-cec0-7991df5c79d7@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-21 11:07:32	f	f	f	2026-09-08 09:22:53.275
cmtsgomko006dy4g5m41hihpi	cmtsgomkf006by4g5kk5bp1xm	cmtrr5oa8000020g5zpr8enij	<29ca8ca0-0124-9893-73fb-65ae07634425@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-21 11:41:52	f	f	f	2026-09-08 09:22:53.64
cmtsgomuw006gy4g5y0c55b8h	cmtsgomul006ey4g5117dmr5k	cmtrr5oa8000020g5zpr8enij	<ea4d792d-cf5b-f2e5-5daf-0230c142930b@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-21 11:41:53	f	f	f	2026-09-08 09:22:54.008
cmtsgon64006jy4g5429zu2au	cmtsgon5n006hy4g5jng7aybn	cmtrr5oa8000020g5zpr8enij	<4e8467f8-3e84-34ec-4eea-d210383be01e@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-21 11:41:55	f	f	f	2026-09-08 09:22:54.412
cmtsgongr006my4g5av8ggrco	cmtsgongf006ky4g5pn70rj2w	cmtrr5oa8000020g5zpr8enij	<220bf73a-8350-efd9-2458-e62e0daf2c73@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-21 11:42:24	f	f	f	2026-09-08 09:22:54.795
cmtsgonqv006py4g524t1g501	cmtsgonqp006ny4g5rzwzii5w	cmtrr5oa8000020g5zpr8enij	<9b0213a5-b91c-7eeb-20b8-d666c4340e7b@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-21 14:29:57	f	f	f	2026-09-08 09:22:55.159
cmtsgonxo006ty4g5zq4xyitl	cmtsgonxd006ry4g5o81xamd0	cmtrr5oa8000020g5zpr8enij	<CAA+JWEAXj=nG84uW_A8p0VBmYVbW8ORZgLN0v-7aSLpZpw=4vw@mail.gmail.com>	\N	<MM0P280MB01529FE525923B79E3DD0DE3AEA32@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>	{<MM0P280MB01529FE525923B79E3DD0DE3AEA32@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>}	ENTRANT	n.traore@t-mak.org	{sas@samko.group}	{admin-finance@t-mak.org,dsissoko@samko.group,dec@samko.group,msamake@samko-conseil.com,segal@samko-conseil.com}	Re: T-MAK CORPORATION Rapport Mensuel d'Assistance Comptable Juillet 2026	\N	2026-08-21 20:33:27	f	f	f	2026-09-08 09:22:55.404
cmtsgony5006vy4g5jeazqp22	cmtsgonxd006ry4g5o81xamd0	cmtrr5oa8000020g5zpr8enij	<CAA+JWEBkcWoQEk-0LW2-iY9Sdc7OBvacLnqqP8ispOH6+5Yx-w@mail.gmail.com>	\N	<MM0P280MB0152A93D39D3266B763D118EAEA22@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>	{<MM0P280MB01529FE525923B79E3DD0DE3AEA32@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<CAA+JWEAXj=nG84uW_A8p0VBmYVbW8ORZgLN0v-7aSLpZpw=4vw@mail.gmail.com>,<MM0P280MB0152A93D39D3266B763D118EAEA22@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>}	ENTRANT	n.traore@t-mak.org	{sas@samko.group}	{admin-finance@t-mak.org,dsissoko@samko.group,dec@samko.group,msamake@samko-conseil.com,segal@samko-conseil.com}	Re: T-MAK CORPORATION Rapport Mensuel d'Assistance Comptable Juillet 2026	\N	2026-08-22 15:35:46	f	f	f	2026-09-08 09:22:55.421
cmtsgoo9m006yy4g5sx17ihl4	cmtsgoo96006wy4g59j3m9a3u	cmtrr5oa8000020g5zpr8enij	<d73bef15-4f86-52b6-601e-997f6ee93ea6@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-24 08:36:39	f	f	f	2026-09-08 09:22:55.834
cmtsgool00071y4g5stqenh47	cmtsgookg006zy4g526oxyyo4	cmtrr5oa8000020g5zpr8enij	<9fc26982-e723-44df-f198-974b00b6197c@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-24 08:36:59	f	f	f	2026-09-08 09:22:56.245
cmtsgoowl0074y4g5mcbdpx3h	cmtsgoow30072y4g54mwgg1wv	cmtrr5oa8000020g5zpr8enij	<4cc628b0-12f4-c35e-1598-e1d9cd327548@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-24 08:37:19	f	f	f	2026-09-08 09:22:56.661
cmtsgop7z0077y4g5ltzx6lfe	cmtsgop7m0075y4g5vvrpq4n7	cmtrr5oa8000020g5zpr8enij	<b9d45ec6-d6e8-7f06-f737-764675654470@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-24 08:37:19	f	f	f	2026-09-08 09:22:57.071
cmtsgophu007ay4g5e614vutk	cmtsgopho0078y4g516epj1n5	cmtrr5oa8000020g5zpr8enij	<01666313-a789-d879-3f93-05c0a55775af@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-24 08:37:39	f	f	f	2026-09-08 09:22:57.426
cmtsgopsh007dy4g5qlketxxl	cmtsgops1007by4g5w90fho1y	cmtrr5oa8000020g5zpr8enij	<87fca958-5f43-65fe-5acc-4fadddd875b4@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-24 08:37:39	f	f	f	2026-09-08 09:22:57.809
cmtsgoq9w007gy4g5te9ldjfh	cmtsgoq9f007ey4g5kt1ub1wm	cmtrr5oa8000020g5zpr8enij	<ae38eabe-39d7-95b4-ecf2-7a91bc968bc3@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-27 12:10:18	f	f	f	2026-09-08 09:22:58.436
cmtsgoqko007jy4g5e43iy8ft	cmtsgoqkj007hy4g55xpgfcot	cmtrr5oa8000020g5zpr8enij	<51f7b21f-7beb-76be-f482-ab2471aaa66c@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-08-27 12:10:18	f	f	f	2026-09-08 09:22:58.824
cmtsgoquj007ny4g5ae25z21h	cmtsgoqu7007ly4g5nlxu6s8w	cmtrr5oa8000020g5zpr8enij	<220200704403505152.0.v2@titan.email>	\N	<DBAP193MB1052790F1949AC8F2BBA7C0CA9AE2@DBAP193MB1052.EURP193.PROD.OUTLOOK.COM>	{<DBAP193MB1052790F1949AC8F2BBA7C0CA9AE2@DBAP193MB1052.EURP193.PROD.OUTLOOK.COM>,<220200704403505152.0.v2@titan.email>}	ENTRANT	bureau@dc-max.tech	{dec@samko.group}	{}	Re: FACTURE SAMKO AOUT 2026	\N	2026-08-27 13:16:09	f	f	f	2026-09-08 09:22:59.179
cmtsgor2u007ry4g5fxtr3i2e	cmtsgor2c007py4g5jawyc6x9	cmtrr5oa8000020g5zpr8enij	<AM0PR08MB396994BF29425BB229D8CF66C5A82@AM0PR08MB3969.eurprd08.prod.outlook.com>	\N	\N	{}	ENTRANT	akobasky@proman.lu	{msamake@samko-conseil.com,dec@samko.group,dsissoko@samko.group}	{bsissoko@proman-project.com,mlefebvre@proman.lu}	726_Validation de la TS-Emission de facture_08/2026_BRS_Projet FACEJ II	\N	2026-09-01 07:40:41	f	f	f	2026-09-08 09:22:59.478
cmtsgord9007uy4g5uz6xw390	cmtsgorcs007sy4g5e4pwr6qo	cmtrr5oa8000020g5zpr8enij	<b45d45ce-7fcb-4d62-63d4-829ce7794c2f@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-02 10:14:18	f	f	f	2026-09-08 09:22:59.853
cmtsgore1007wy4g59ozi5j0a	cmtsgor2c007py4g5jawyc6x9	cmtrr5oa8000020g5zpr8enij	<AM0PR08MB39698C9F5954CA5FA73A8076C5B72@AM0PR08MB3969.eurprd08.prod.outlook.com>	\N	<AS8PR08MB7944E39CB592CD0A0135E581A5B72@AS8PR08MB7944.eurprd08.prod.outlook.com>	{<AM0PR08MB396994BF29425BB229D8CF66C5A82@AM0PR08MB3969.eurprd08.prod.outlook.com>,<AS8PR08MB7944E39CB592CD0A0135E581A5B72@AS8PR08MB7944.eurprd08.prod.outlook.com>}	ENTRANT	akobasky@proman.lu	{dsissoko@samko.group,msamake@samko-conseil.com,dec@samko.group}	{bsissoko@proman-project.com,mlefebvre@proman.lu}	RE: 726_Validation de la TS-Emission de facture_08/2026_BRS_Projet FACEJ II	\N	2026-09-02 11:59:50	f	f	f	2026-09-08 09:22:59.881
cmtsgorpg007zy4g5q4gqbhvq	cmtsgorp1007xy4g5w3b0mokg	cmtrr5oa8000020g5zpr8enij	<8883bac6-f671-89f5-a376-1701e9fc1e70@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-03 08:21:32	f	f	f	2026-09-08 09:23:00.292
cmtvvpv5x0001s4g5chqlw4tr	cmtsgoi0v004xy4g5edx8sum0	cmtrr5oa8000020g5zpr8enij	<MI9PR01MB965199776848BC826513610A43FEB12@MI9PR01MB965199.eurprd01.prod.exchangelabs.com>	\N	<AM9PR01MB8363741C4AB52F2C6A41CC0196A72@AM9PR01MB8363.eurprd01.prod.exchangelabs.com>	{<DB8PR01MB6011BC30BFA2C3B9EEAF042DE882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<PR3PR03MB65075DC4EC8896580CC52E71EF82A@PR3PR03MB6507.eurprd03.prod.outlook.com>,<DB8PR01MB6011BAD77D868C3A5065C362E882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<DB8PR01MB60110928ED5EE5F0FBD2AFBCE881A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<AM7PR01MB713850E2B576492D192151F0FE81A@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<000a01dc8474$d78877b0$86996710$@samko-academy.com>,<007d01dc8656$ed7353e0$c859fba0$@samko-academy.com>,<DU0PR01MB1006622E634BAF932ACD0C02D8F8BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<PR1P264MB1901A41361150E4A46ED0573F788A@PR1P264MB1901.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB1006691811B3A73FD6FDB58AC8F89A@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB18902D83D6CE4394B713C2C9F789A@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB10066375ADB9EC921FA316FB98F9BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB1890F0CE8FED8BBB436C5004F79BA@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<AM7PR01MB66286E7AA7281E36572780B78FE32@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152A60B7DE030E5F0E11F8CAEEE2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<GVYP280MB0157FDC73734909B531AF116AEFE2@GVYP280MB0157.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB6628F7844C749D0A66C3A6D28FFD2@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152EBE59A0F4B53FD359D53AEDD2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138E5FC4FE110647FF97F14FEDD2@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<MM0P280MB01523021473BF196DF57F3ABAEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138900B810CE93A29E46C88FEA72@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<AM9PR01MB8363741C4AB52F2C6A41CC0196A72@AM9PR01MB8363.eurprd01.prod.exchangelabs.com>}	ENTRANT	ghislaineflore.tchoudjem@care.org	{maureenava.lahat@care.org}	{christine.batoum@care.org,vanessa.momo@care.org,valentinchristian.assonkeng@care.org,marcdominique.kuate@care.org,denis.douina@care.org,serge.ngwa@care.org,fatima.pangilinan@care.org,kimrose.bagawisan@care.org,harlene.tabinas@care.org,dec@samko.group,msamake@samko-conseil.com}	RE: CONSULTATION SYCEBNL - ETATS FINANCIER 2025 CARE CMR : Première réunion de cadrage	\N	2026-09-08 11:54:57	f	f	f	2026-09-10 18:47:04.197
cmtvvpv9v0003s4g589uy23bt	cmtsgoi0v004xy4g5edx8sum0	cmtrr5oa8000020g5zpr8enij	<DB9PR01MB117402D8070A4C362A6DBD1C896B12@DB9PR01MB11740.eurprd01.prod.exchangelabs.com>	\N	<MI9PR01MB965199776848BC826513610A43FEB12@MI9PR01MB965199.eurprd01.prod.exchangelabs.com>	{<DB8PR01MB6011BC30BFA2C3B9EEAF042DE882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<PR3PR03MB65075DC4EC8896580CC52E71EF82A@PR3PR03MB6507.eurprd03.prod.outlook.com>,<DB8PR01MB6011BAD77D868C3A5065C362E882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<DB8PR01MB60110928ED5EE5F0FBD2AFBCE881A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<AM7PR01MB713850E2B576492D192151F0FE81A@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<000a01dc8474$d78877b0$86996710$@samko-academy.com>,<007d01dc8656$ed7353e0$c859fba0$@samko-academy.com>,<DU0PR01MB1006622E634BAF932ACD0C02D8F8BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<PR1P264MB1901A41361150E4A46ED0573F788A@PR1P264MB1901.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB1006691811B3A73FD6FDB58AC8F89A@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB18902D83D6CE4394B713C2C9F789A@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB10066375ADB9EC921FA316FB98F9BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB1890F0CE8FED8BBB436C5004F79BA@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<AM7PR01MB66286E7AA7281E36572780B78FE32@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152A60B7DE030E5F0E11F8CAEEE2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<GVYP280MB0157FDC73734909B531AF116AEFE2@GVYP280MB0157.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB6628F7844C749D0A66C3A6D28FFD2@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152EBE59A0F4B53FD359D53AEDD2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138E5FC4FE110647FF97F14FEDD2@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<MM0P280MB01523021473BF196DF57F3ABAEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138900B810CE93A29E46C88FEA72@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<AM9PR01MB8363741C4AB52F2C6A41CC0196A72@AM9PR01MB8363.eurprd01.prod.exchangelabs.com>,<MI9PR01MB965199776848BC826513610A43FEB12@MI9PR01MB965199.eurprd01.prod.exchangelabs.com>}	ENTRANT	kimrose.bagawisan@care.org	{ghislaineflore.tchoudjem@care.org,maureenava.lahat@care.org,lester.mendiola@care.org}	{christine.batoum@care.org,vanessa.momo@care.org,valentinchristian.assonkeng@care.org,marcdominique.kuate@care.org,denis.douina@care.org,serge.ngwa@care.org,fatima.pangilinan@care.org,harlene.tabinas@care.org,dec@samko.group,msamake@samko-conseil.com}	Re: CONSULTATION SYCEBNL - ETATS FINANCIER 2025 CARE CMR : Première réunion de cadrage	\N	2026-09-08 12:32:19	f	f	f	2026-09-10 18:47:04.339
cmtvx5g0c0001h8g56q1to5cn	cmtvvpxvk000os4g5nutihx80	cmtrr5oa8000020g5zpr8enij	<CAGj=77kVK-qyj-XFrRB2QxnnKHeVn5pE2FdGhHsd9w6tGrAkrg@mail.gmail.com>	\N	<mailflow-transfer-mtvvq068-9cbvr13s@samko.group>	{<mailflow-e2e-1789066018252@client-externe.example>,<mailflow-transfer-mtvvq068-9cbvr13s@samko.group>}	ENTRANT	mamounberthe@gmail.com	{dec@samko.group}	{}	Re: MAILFLOW-E2E 2026-09-10T18:46 — devis à transférer	\N	2026-09-10 19:26:19	f	f	f	2026-09-10 19:27:10.668
cmtvx5gpn0005h8g549zz5r33	cmtvx5gke0003h8g5n2fufqi6	cmtrr5oa8000020g5zpr8enij	<mailflow-e2e-1789068425614@client-externe.example>	\N	\N	{}	ENTRANT	essai-mailflow@client-externe.example	{dec@samko.group}	{}	MAILFLOW-E2E 2026-09-10T19:27 — devis à transférer	\N	2026-09-10 19:27:05	t	f	f	2026-09-10 19:27:11.579
cmtvx8zm00001p8g58u13r0sc	cmtvx5gke0003h8g5n2fufqi6	cmtrr5oa8000020g5zpr8enij	<CAGj=77n5TkY73+pSq1XezGRTCzdKgGK8mfEBz=XyMsMJi1CjEw@mail.gmail.com>	\N	<mailflow-transfer-mtvx5iup-0tw8p3ww@samko.group>	{<mailflow-e2e-1789068425614@client-externe.example>,<mailflow-transfer-mtvx5iup-0tw8p3ww@samko.group>}	ENTRANT	mamounberthe@gmail.com	{dec@samko.group}	{}	Re: MAILFLOW-E2E 2026-09-10T19:27 — devis à transférer	\N	2026-09-10 19:28:38	f	f	f	2026-09-10 19:29:56.04
cmtvvpvar0005s4g5vzopri7z	cmtsgoi0v004xy4g5edx8sum0	cmtrr5oa8000020g5zpr8enij	<AMBPR01MB13007AB1153D69FD2CF49975C85B12@AMBPR01MB13007.eurprd01.prod.exchangelabs.com>	\N	<DB9PR01MB117402D8070A4C362A6DBD1C896B12@DB9PR01MB11740.eurprd01.prod.exchangelabs.com>	{<DB8PR01MB6011BC30BFA2C3B9EEAF042DE882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<PR3PR03MB65075DC4EC8896580CC52E71EF82A@PR3PR03MB6507.eurprd03.prod.outlook.com>,<DB8PR01MB6011BAD77D868C3A5065C362E882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<DB8PR01MB60110928ED5EE5F0FBD2AFBCE881A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<AM7PR01MB713850E2B576492D192151F0FE81A@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<000a01dc8474$d78877b0$86996710$@samko-academy.com>,<007d01dc8656$ed7353e0$c859fba0$@samko-academy.com>,<DU0PR01MB1006622E634BAF932ACD0C02D8F8BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<PR1P264MB1901A41361150E4A46ED0573F788A@PR1P264MB1901.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB1006691811B3A73FD6FDB58AC8F89A@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB18902D83D6CE4394B713C2C9F789A@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB10066375ADB9EC921FA316FB98F9BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB1890F0CE8FED8BBB436C5004F79BA@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<AM7PR01MB66286E7AA7281E36572780B78FE32@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152A60B7DE030E5F0E11F8CAEEE2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<GVYP280MB0157FDC73734909B531AF116AEFE2@GVYP280MB0157.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB6628F7844C749D0A66C3A6D28FFD2@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152EBE59A0F4B53FD359D53AEDD2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138E5FC4FE110647FF97F14FEDD2@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<MM0P280MB01523021473BF196DF57F3ABAEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138900B810CE93A29E46C88FEA72@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<AM9PR01MB8363741C4AB52F2C6A41CC0196A72@AM9PR01MB8363.eurprd01.prod.exchangelabs.com>,<MI9PR01MB965199776848BC826513610A43FEB12@MI9PR01MB965199.eurprd01.prod.exchangelabs.com>,<DB9PR01MB117402D8070A4C362A6DBD1C896B12@DB9PR01MB11740.eurprd01.prod.exchangelabs.com>}	ENTRANT	lester.mendiola@care.org	{kimrose.bagawisan@care.org,ghislaineflore.tchoudjem@care.org,maureenava.lahat@care.org}	{christine.batoum@care.org,vanessa.momo@care.org,valentinchristian.assonkeng@care.org,marcdominique.kuate@care.org,denis.douina@care.org,serge.ngwa@care.org,fatima.pangilinan@care.org,harlene.tabinas@care.org,dec@samko.group,msamake@samko-conseil.com}	RE: CONSULTATION SYCEBNL - ETATS FINANCIER 2025 CARE CMR : Première réunion de cadrage	\N	2026-09-08 14:37:10	f	f	f	2026-09-10 18:47:04.371
cmtvvpvbj0007s4g5nw4v4xqi	cmtsgoi0v004xy4g5edx8sum0	cmtrr5oa8000020g5zpr8enij	<DB9PR01MB1174065569260ED837DD6664496B02@DB9PR01MB11740.eurprd01.prod.exchangelabs.com>	\N	<AMBPR01MB13007AB1153D69FD2CF49975C85B12@AMBPR01MB13007.eurprd01.prod.exchangelabs.com>	{<DB8PR01MB6011BC30BFA2C3B9EEAF042DE882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<PR3PR03MB65075DC4EC8896580CC52E71EF82A@PR3PR03MB6507.eurprd03.prod.outlook.com>,<DB8PR01MB6011BAD77D868C3A5065C362E882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<DB8PR01MB60110928ED5EE5F0FBD2AFBCE881A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<AM7PR01MB713850E2B576492D192151F0FE81A@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<000a01dc8474$d78877b0$86996710$@samko-academy.com>,<007d01dc8656$ed7353e0$c859fba0$@samko-academy.com>,<DU0PR01MB1006622E634BAF932ACD0C02D8F8BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<PR1P264MB1901A41361150E4A46ED0573F788A@PR1P264MB1901.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB1006691811B3A73FD6FDB58AC8F89A@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB18902D83D6CE4394B713C2C9F789A@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB10066375ADB9EC921FA316FB98F9BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB1890F0CE8FED8BBB436C5004F79BA@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<AM7PR01MB66286E7AA7281E36572780B78FE32@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152A60B7DE030E5F0E11F8CAEEE2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<GVYP280MB0157FDC73734909B531AF116AEFE2@GVYP280MB0157.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB6628F7844C749D0A66C3A6D28FFD2@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152EBE59A0F4B53FD359D53AEDD2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138E5FC4FE110647FF97F14FEDD2@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<MM0P280MB01523021473BF196DF57F3ABAEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138900B810CE93A29E46C88FEA72@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<AM9PR01MB8363741C4AB52F2C6A41CC0196A72@AM9PR01MB8363.eurprd01.prod.exchangelabs.com>,<MI9PR01MB965199776848BC826513610A43FEB12@MI9PR01MB965199.eurprd01.prod.exchangelabs.com>,<DB9PR01MB117402D8070A4C362A6DBD1C896B12@DB9PR01MB11740.eurprd01.prod.exchangelabs.com>,<AMBPR01MB13007AB1153D69FD2CF49975C85B12@AMBPR01MB13007.eurprd01.prod.exchangelabs.com>}	ENTRANT	kimrose.bagawisan@care.org	{lester.mendiola@care.org,ghislaineflore.tchoudjem@care.org,maureenava.lahat@care.org,fatima.pangilinan@care.org}	{christine.batoum@care.org,vanessa.momo@care.org,valentinchristian.assonkeng@care.org,marcdominique.kuate@care.org,denis.douina@care.org,serge.ngwa@care.org,harlene.tabinas@care.org,dec@samko.group,msamake@samko-conseil.com}	Re: CONSULTATION SYCEBNL - ETATS FINANCIER 2025 CARE CMR : Première réunion de cadrage	\N	2026-09-09 08:13:36	f	f	f	2026-09-10 18:47:04.399
cmtvvpvv7000as4g5ofup45u3	cmtvvpvp30008s4g5toty9vte	cmtrr5oa8000020g5zpr8enij	<9e4fadc2-0e7d-0ea2-805c-8719fb56a1f7@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-09 15:37:50	f	f	f	2026-09-10 18:47:05.107
cmtvvpw8j000ds4g5w73o89bu	cmtvvpw81000bs4g5je7hoei5	cmtrr5oa8000020g5zpr8enij	<651e6524-a33d-eba3-f52e-637812fdb608@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-09 17:00:29	f	f	f	2026-09-10 18:47:05.587
cmtvvpwlk000gs4g5v9qugnnh	cmtvvpwl2000es4g53vo9hgp1	cmtrr5oa8000020g5zpr8enij	<41ea201d-ea45-65f7-e875-970e0995a619@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-10 15:55:23	f	f	f	2026-09-10 18:47:06.056
cmtvvpx4l000js4g54edhuemq	cmtvvpx45000hs4g526kj3ptg	cmtrr5oa8000020g5zpr8enij	<aa6d04bd-703f-fe7f-5622-7a06a44605cd@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-10 15:56:03	f	f	f	2026-09-10 18:47:06.741
cmtvvpxlt000ms4g53jsdp4ke	cmtvvpxl9000ks4g5ewwlg35x	cmtrr5oa8000020g5zpr8enij	<dc0e6aa3-b272-015e-d06c-cdca26eaa0a2@dgi.gouv.ml>	\N	\N	{}	ENTRANT	e-impot@dgi.gouv.ml	{dec@samko.group}	{}	E-Impôt- Avis de courriel	\N	2026-09-10 15:56:42	f	f	f	2026-09-10 18:47:07.361
cmtvvpxws000qs4g5s1vs9or5	cmtvvpxvk000os4g5nutihx80	cmtrr5oa8000020g5zpr8enij	<mailflow-e2e-1789066018252@client-externe.example>	\N	\N	{}	ENTRANT	essai-mailflow@client-externe.example	{dec@samko.group}	{}	MAILFLOW-E2E 2026-09-10T18:46 — devis à transférer	\N	2026-09-10 18:46:58	t	f	f	2026-09-10 18:47:07.756
cmtvvpyac000ts4g5ivzobhb9	cmtsgoi0v004xy4g5edx8sum0	cmtrr5oa8000020g5zpr8enij	<DBAP193MB1052BDC232764C11CF3C9741A9B12@DBAP193MB1052.EURP193.PROD.OUTLOOK.COM>	\N	<AM7PR01MB7138666BA157EEBB9C65475BFEA72@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>	{<DB8PR01MB6011BC30BFA2C3B9EEAF042DE882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<PR3PR03MB65075DC4EC8896580CC52E71EF82A@PR3PR03MB6507.eurprd03.prod.outlook.com>,<DB8PR01MB6011BAD77D868C3A5065C362E882A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<DB8PR01MB60110928ED5EE5F0FBD2AFBCE881A@DB8PR01MB6011.eurprd01.prod.exchangelabs.com>,<AM7PR01MB713850E2B576492D192151F0FE81A@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<000a01dc8474$d78877b0$86996710$@samko-academy.com>,<007d01dc8656$ed7353e0$c859fba0$@samko-academy.com>,<DU0PR01MB1006622E634BAF932ACD0C02D8F8BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<PR1P264MB1901A41361150E4A46ED0573F788A@PR1P264MB1901.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB1006691811B3A73FD6FDB58AC8F89A@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB18902D83D6CE4394B713C2C9F789A@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<DU0PR01MB10066375ADB9EC921FA316FB98F9BA@DU0PR01MB10066.eurprd01.prod.exchangelabs.com>,<MR1P264MB1890F0CE8FED8BBB436C5004F79BA@MR1P264MB1890.FRAP264.PROD.OUTLOOK.COM>,<AM7PR01MB66286E7AA7281E36572780B78FE32@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152A60B7DE030E5F0E11F8CAEEE2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<GVYP280MB0157FDC73734909B531AF116AEFE2@GVYP280MB0157.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB6628F7844C749D0A66C3A6D28FFD2@AM7PR01MB6628.eurprd01.prod.exchangelabs.com>,<MM0P280MB0152EBE59A0F4B53FD359D53AEDD2@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138E5FC4FE110647FF97F14FEDD2@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>,<MM0P280MB01523021473BF196DF57F3ABAEA72@MM0P280MB0152.SWEP280.PROD.OUTLOOK.COM>,<AM7PR01MB7138666BA157EEBB9C65475BFEA72@AM7PR01MB7138.eurprd01.prod.exchangelabs.com>}	SORTANT	dec@samko.group	{ghislaineflore.tchoudjem@care.org,sas@samko.group,marcdominique.kuate@care.org,ddiarra@samko.group,saasamake@samko-academy.com,msamake@samko-conseil.com,aguelly@samko-academy.com,bdev@samko.group,mtraore@samko-academy.com,valentinchristian.assonkeng@care.org}	{mtraore@samko.group,christine.batoum@care.org,sas@samko-academy.com,leoniebeatrice.bana@care.org,vanessa.momo@care.org}	RE: CONSULTATION SYCEBNL - ETATS FINANCIER 2025 CARE CMR : Première réunion de cadrage	\N	2026-09-08 10:49:34	f	f	f	2026-09-10 18:47:08.244
\.


--
-- Data for Name: modele_message; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.modele_message (id, code, libelle, sujet, corps, actif, cree_le, modifie_le) FROM stdin;
cmtqgt56t00009gg5qepavmro	RAPPEL_COURTOIS	Rappel courtois (1re relance)	Rappel · {{sujet}}	Bonjour,\n\nLe message ci-dessous de {{correspondant}} ({{organisation}}), reçu le {{recuLe}},\nattend une réponse depuis {{joursEcoules}}.\n\nOuvrir le message : {{lienMail}}\nVoir la fiche de suivi : {{lienFiche}}\n\nRéf. {{numero}}	t	2026-09-06 23:50:52.037	2026-09-06 23:51:12.09
cmtqgt56z00019gg5418pgc7w	RAPPEL_FERME	Rappel ferme, avec copie (2e et 3e relances)	Relance {{numero}} · {{sujet}}	Bonjour,\n\nLe dossier {{numero}} est sans réponse depuis {{joursEcoules}}.\nÉchéance dépassée : {{echeance}}.\nCorrespondant : {{correspondant}} ({{organisation}}).\n\nMerci de répondre depuis la boîte suivie, afin que la réponse soit\ndétectée automatiquement et que les relances s'arrêtent.\n\nOuvrir le message : {{lienMail}}	t	2026-09-06 23:50:52.043	2026-09-06 23:51:12.092
cmtqgt57200029gg56lo8aaw1	ESCALADE	Note d'escalade vers la hiérarchie	Escalade · {{numero}} sans réponse · {{sujet}}	Bonjour,\n\nLe dossier {{numero}} a épuisé ses relances sans obtenir de réponse.\n\nCorrespondant : {{correspondant}} ({{organisation}})\nReçu le : {{recuLe}}\nSans réponse depuis : {{joursEcoules}}\n\nUne décision est attendue : réaffecter, relancer autrement,\nou classer sans suite avec motif.\n\nVoir la fiche : {{lienFiche}}	t	2026-09-06 23:50:52.046	2026-09-06 23:51:12.095
\.


--
-- Data for Name: parametre; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.parametre (cle, valeur, libelle, modifie_le) FROM stdin;
fuseau_site	"Africa/Bamako"	Fuseau horaire du site	2026-09-06 23:51:11.982
jours_ouvres	[1, 2, 3, 4, 5]	Jours travaillés (1 = lundi)	2026-09-06 23:51:12.072
cadence_synchro_minutes	5	Filet de sécurité : interrogation différentielle de la boîte	2026-09-06 23:51:12.077
delai_attribution_heures_ouvrees	4	Au-delà, un échange sans propriétaire est un incident (règle RG-12)	2026-09-06 23:51:12.08
alerte_battement_coeur_minutes	15	Aucun passage du moteur pendant cette durée déclenche une alerte	2026-09-06 23:51:12.082
alerte_expiration_secret_jours	30	Préavis avant expiration du secret du compte de service	2026-09-06 23:51:12.084
fenetre_envoi	{"fin": "18:00", "debut": "08:00"}	Plage d'expédition des relances	2026-09-06 23:51:12.075
moteur_dernier_passage	{"a": "2026-09-08T09:59:44.034Z", "pris": 1, "echecs": 0, "dureeMs": 2384, "perimes": 0, "refuses": 0, "executes": 1, "reportes": 0}	Dernier passage de l'ordonnanceur	2026-09-08 09:59:44.049
alertes_etat	{"filigrane": "2026-09-08T09:54:25.984Z", "derniersEnvois": {"MOTEUR_SILENCIEUX": "2026-09-08T09:54:25.981Z"}}	Suivi des alertes déjà diffusées	2026-09-08 09:59:44.579
\.


--
-- Data for Name: piece_jointe; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.piece_jointe (id, message_id, nom_origine, type_mime, taille_octets, empreinte, cle_stockage, telecharge_le, est_incorporee, cree_le) FROM stdin;
cmtvvpxwu000rs4g5gq1vb85q	cmtvvpxws000qs4g5s1vs9or5	contrat.pdf	application/pdf	96	\N	\N	\N	f	2026-09-10 18:47:07.756
cmtvvpxwu000ss4g5sar2vr3r	cmtvvpxws000qs4g5s1vs9or5	Rapport définitif — année 2026.pdf	application/pdf	96	\N	\N	\N	f	2026-09-10 18:47:07.756
cmtvx5gps0006h8g5pm5zy1nl	cmtvx5gpn0005h8g549zz5r33	contrat.pdf	application/pdf	96	\N	\N	\N	f	2026-09-10 19:27:11.579
cmtvx5gps0007h8g5vrjecbeq	cmtvx5gpn0005h8g549zz5r33	Rapport définitif — année 2026.pdf	application/pdf	96	\N	\N	\N	f	2026-09-10 19:27:11.579
\.


--
-- Data for Name: regle_relance; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.regle_relance (id, categorie_id, ordre, delai_jours_ouvres, destinataire, copie_a, modele_id, actif, cree_le, modifie_le) FROM stdin;
cmtqgt57r00049gg5p87k93tj	cmtqgt57h00039gg538o7p8fy	1	3	PROPRIETAIRE	{}	cmtqgt56t00009gg5qepavmro	t	2026-09-06 23:50:52.071	2026-09-06 23:51:12.119
cmtqgt58000059gg5vwmlgjee	cmtqgt57h00039gg538o7p8fy	2	1	ESCALADE	{}	cmtqgt57200029gg56lo8aaw1	t	2026-09-06 23:50:52.08	2026-09-06 23:51:12.123
cmtqgt58700079gg5dp5yv3zr	cmtqgt58400069gg551dxuk92	1	1	PROPRIETAIRE	{}	cmtqgt56t00009gg5qepavmro	t	2026-09-06 23:50:52.087	2026-09-06 23:51:12.131
cmtqgt58900089gg5r6fpbais	cmtqgt58400069gg551dxuk92	2	1	PROPRIETAIRE	{}	cmtqgt56z00019gg5418pgc7w	t	2026-09-06 23:50:52.089	2026-09-06 23:51:12.133
cmtqgt58b00099gg5wvm2z408	cmtqgt58400069gg551dxuk92	3	1	ESCALADE	{}	cmtqgt57200029gg56lo8aaw1	t	2026-09-06 23:50:52.091	2026-09-06 23:51:12.135
cmtqgt58i000b9gg52jg74u0e	cmtqgt58f000a9gg5l8lc9s0l	1	2	PROPRIETAIRE	{}	cmtqgt56t00009gg5qepavmro	t	2026-09-06 23:50:52.098	2026-09-06 23:51:12.142
cmtqgt58l000c9gg5u1egca4w	cmtqgt58f000a9gg5l8lc9s0l	2	2	PROPRIETAIRE	{}	cmtqgt56z00019gg5418pgc7w	t	2026-09-06 23:50:52.101	2026-09-06 23:51:12.145
cmtqgt58o000d9gg50o5jshna	cmtqgt58f000a9gg5l8lc9s0l	3	3	ESCALADE	{}	cmtqgt57200029gg56lo8aaw1	t	2026-09-06 23:50:52.104	2026-09-06 23:51:12.148
cmtqgt58s000f9gg57vi5zsuk	cmtqgt58q000e9gg50mg8f4oa	1	1	PROPRIETAIRE	{}	cmtqgt56t00009gg5qepavmro	t	2026-09-06 23:50:52.108	2026-09-06 23:51:12.156
cmtqgt58u000g9gg5ar9po9qp	cmtqgt58q000e9gg50mg8f4oa	2	2	PROPRIETAIRE	{}	cmtqgt56z00019gg5418pgc7w	t	2026-09-06 23:50:52.11	2026-09-06 23:51:12.159
cmtqgt58w000h9gg5v65atqtm	cmtqgt58q000e9gg50mg8f4oa	3	2	ESCALADE	{}	cmtqgt57200029gg56lo8aaw1	t	2026-09-06 23:50:52.112	2026-09-06 23:51:12.161
cmtqgt591000j9gg500ozlf6f	cmtqgt58z000i9gg5lw4xh259	1	3	PROPRIETAIRE	{}	cmtqgt56t00009gg5qepavmro	t	2026-09-06 23:50:52.117	2026-09-06 23:51:12.166
cmtqgt593000k9gg5l2ovj969	cmtqgt58z000i9gg5lw4xh259	2	3	ESCALADE	{}	cmtqgt57200029gg56lo8aaw1	t	2026-09-06 23:50:52.119	2026-09-06 23:51:12.168
\.


--
-- Data for Name: relance; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.relance (id, echange_id, ordre, destinataire_id, copie_a, modele_id, statut, envoyee_le, message_id_envoye, erreur, cle_idempotence) FROM stdin;
cmtrb23qi000n04g58l54plzd	cmtrb23hw000l04g57uj226l1	1	cmtrb238n000704g585q1vjii	{}	\N	ENVOYEE	2026-09-06 07:24:00	\N	\N	demo-1-relance-1
cmtrb23qp000o04g5m0ssrke1	cmtrb23hw000l04g57uj226l1	2	cmtrb238n000704g585q1vjii	{}	\N	ENVOYEE	2026-09-07 07:24:00	\N	\N	demo-1-relance-2
cmtrb23rm000r04g5p39o9a3f	cmtrb23r7000p04g5dwhra62p	1	cmtrb238z000804g5igkoyh1j	{}	\N	ENVOYEE	2026-09-05 10:24:00	\N	\N	demo-2-relance-1
cmtrb23rv000s04g5ch6pplo8	cmtrb23r7000p04g5dwhra62p	2	cmtrb238z000804g5igkoyh1j	{}	\N	ENVOYEE	2026-09-06 10:24:00	\N	\N	demo-2-relance-2
cmtrb23sr000v04g5phrsfifa	cmtrb23sb000t04g5d4up9gy7	1	cmtrb238z000804g5igkoyh1j	{}	\N	ENVOYEE	2026-09-07 05:24:00	\N	\N	demo-3-relance-1
cmtrb23tw000y04g5t6r6m9as	cmtrb23td000w04g5nkqkl1r1	1	cmtrb239k000904g5zjr5hvz1	{}	\N	ENVOYEE	2026-09-07 04:24:00	\N	\N	demo-4-relance-1
cmtrb241r001h04g5c1bwr4to	cmtrb2418001f04g52d1kf34g	1	cmtrb238n000704g585q1vjii	{}	\N	ENVOYEE	2026-09-06 10:24:00	\N	\N	demo-13-relance-1
cmtrb243g001o04g5zfyg63xb	cmtrb2432001m04g5kvjtqisg	1	cmtrb2372000604g5852ipk4u	{}	\N	ENVOYEE	2026-09-03 10:24:00	\N	\N	demo-16-relance-1
cmtrb243k001p04g5dc14kow7	cmtrb2432001m04g5kvjtqisg	2	cmtrb2372000604g5852ipk4u	{}	\N	ENVOYEE	2026-09-04 10:24:00	\N	\N	demo-16-relance-2
cmtrb245a001u04g5ctq76rxu	cmtrb244v001s04g5tw30to96	1	cmtrb238z000804g5igkoyh1j	{}	\N	ENVOYEE	2026-08-07 10:24:00	\N	\N	demo-18-relance-1
cmtrb2c9o0001xsg5o8q2jyzc	cmtrb23hw000l04g57uj226l1	3	cmtrb238n000704g585q1vjii	{}	\N	ENVOYEE	2026-09-07 13:57:49.508	\N	\N	cmtrb23hw000l04g57uj226l1-relance-3
cmtrb2ccu0004xsg50aa19xwf	cmtrb23sb000t04g5d4up9gy7	2	cmtrb238z000804g5igkoyh1j	{}	\N	ENVOYEE	2026-09-07 13:57:49.69	\N	\N	cmtrb23sb000t04g5d4up9gy7-relance-2
\.


--
-- Data for Name: travail_planifie; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.travail_planifie (id, type, echange_id, executer_a, statut, tentatives, derniere_erreur, verrou_par, verrou_a, charge, cle_idempotence, cree_le, termine_le) FROM stdin;
cmtsm6wla0006qsg590wjifc5	RELANCE	cmtsgoa8z0029y4g53l3ery6y	2026-08-13 11:26:36	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoa8z0029y4g53l3ery6y-RELANCE-2026-08-13T11:26:36.000Z	2026-09-08 11:57:04.51	2026-09-09 11:03:02.651
cmtvfqeii0002hwg5ld3x6qdr	ARCHIVAGE	cmtsgor2c007py4g5jawyc6x9	2026-09-17 11:19:35.279	EN_ATTENTE	0	\N	\N	\N	\N	cmtsgor2c007py4g5jawyc6x9-ARCHIVAGE-2026-09-17T11:19:35.279Z	2026-09-10 11:19:35.418	\N
cmtsm6wlz0009qsg59i9d0qiw	RELANCE	cmtsgoakd002cy4g56ysi0yfp	2026-08-13 11:32:16	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoakd002cy4g56ysi0yfp-RELANCE-2026-08-13T11:32:16.000Z	2026-09-08 11:57:04.535	2026-09-09 11:03:03.063
cmtsm6wmo000cqsg53z55arok	RELANCE	cmtsgoav2002fy4g5otcyvmwt	2026-08-13 11:32:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoav2002fy4g5otcyvmwt-RELANCE-2026-08-13T11:32:56.000Z	2026-09-08 11:57:04.56	2026-09-09 11:03:03.155
cmtsgo1dt0000y4g5lh221c5n	SYNCHRO_BOITE	\N	2026-09-08 09:22:26.163	TERMINE	0	\N	\N	\N	{"boite": "dec@samko.group"}	synchro-dec@samko.group-2026-09-08T09:22:26.163Z	2026-09-08 09:22:26.177	2026-09-08 09:23:04.559
cmtsm6wnc000fqsg5thf92r6a	RELANCE	cmtsgob5v002iy4g5xd5u2h8a	2026-08-13 11:40:17	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgob5v002iy4g5xd5u2h8a-RELANCE-2026-08-13T11:40:17.000Z	2026-09-08 11:57:04.584	2026-09-09 11:03:03.214
cmtsm6wny000iqsg5metcmvok	RELANCE	cmtsgobga002ly4g5rk9g0koh	2026-08-13 11:43:55	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgobga002ly4g5rk9g0koh-RELANCE-2026-08-13T11:43:55.000Z	2026-09-08 11:57:04.606	2026-09-09 11:03:03.267
cmtsgouzv0080y4g5uqpinyo6	SYNCHRO_BOITE	\N	2026-09-08 09:25:45.39	TERMINE	0	\N	\N	\N	{"boite": "dec@samko.group"}	synchro-dec@samko.group-2026-09-08T09:28:04.555Z	2026-09-08 09:23:04.555	2026-09-08 09:25:53.214
cmtsgsh4q0001yog5dkcq0rz5	SYNCHRO_BOITE	\N	2026-09-08 09:26:26.946	TERMINE	0	\N	\N	\N	{"boite": "dec@samko.group"}	synchro-dec@samko.group-2026-09-08T09:30:53.204Z	2026-09-08 09:25:53.21	2026-09-08 09:26:35.574
cmttzpavc001iw8g563n2lm47	RELANCE	cmtrrf0hv000n7gg5wju6b06i	2026-09-10 13:14:43	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrf0hv000n7gg5wju6b06i-RELANCE-2026-09-10T13:14:43.000Z	2026-09-09 11:03:04.008	\N
cmtsm6byv000614g5m777vkiu	RELANCE	cmtrb240h001d04g5aua0ffc7	2026-09-09 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrb240h001d04g5aua0ffc7-RELANCE-2026-09-09T08:00:00.000Z	2026-09-08 11:56:37.784	2026-09-09 11:03:04.175
cmtsm6wk90003qsg5wo3ahiib	RELANCE	cmtsgo9xq0026y4g5n03aud9m	2026-08-13 11:12:36	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo9xq0026y4g5n03aud9m-RELANCE-2026-08-13T11:12:36.000Z	2026-09-08 11:57:04.473	2026-09-09 11:03:05.56
cmtsgtdtb0000iwg5rf3zht4q	SYNCHRO_BOITE	\N	2026-09-08 09:31:35.553	TERMINE	0	\N	\N	\N	{"boite": "dec@samko.group"}	synchro-dec@samko.group-2026-09-08T09:31:35.553Z	2026-09-08 09:26:35.568	2026-09-08 09:31:42
cmttzpa080000w8g59wpufrxd	RELANCE	cmtsgoa8z0029y4g53l3ery6y	2026-08-14 11:26:36	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoa8z0029y4g53l3ery6y-RELANCE-2026-08-14T11:26:36.000Z	2026-09-09 11:03:02.888	2026-09-09 11:19:41.547
cmtsgzy950000qwg5oxjjpkb3	SYNCHRO_BOITE	\N	2026-09-08 09:36:41.98	TERMINE	0	\N	\N	\N	{"boite": "dec@samko.group"}	synchro-dec@samko.group-2026-09-08T09:36:41.980Z	2026-09-08 09:31:41.993	2026-09-08 09:42:24.73
cmtshdq6u00054og59balaotv	SYNCHRO_BOITE	\N	2026-09-08 09:47:24.722	TERMINE	0	\N	\N	\N	{"boite": "dec@samko.group"}	synchro-dec@samko.group-2026-09-08T09:47:24.722Z	2026-09-08 09:42:24.726	2026-09-08 09:54:25.218
cmtsi00400000b8g5qnb66woh	SYNCHRO_BOITE	\N	2026-09-08 10:04:44	EN_ATTENTE	0	\N	\N	\N	{"boite": "dec@samko.group"}	synchro-dec@samko.group-2026-09-08T10:04:44.000Z	2026-09-08 09:59:44.016	\N
cmtsht63j0000usg5gnhvppxf	SYNCHRO_BOITE	\N	2026-09-08 09:59:25.166	TERMINE	0	\N	\N	\N	{"boite": "dec@samko.group"}	synchro-dec@samko.group-2026-09-08T09:59:25.166Z	2026-09-08 09:54:25.184	2026-09-08 09:59:44.024
cmtrb24bt002504g5dzeaef9z	RELANCE	cmtrb23xw001504g5nqhuph65	2026-09-10 10:24:00	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	demo-travail-cmtrb23xw001504g5nqhuph65	2026-09-07 13:57:39.305	\N
cmtrb24aj001z04g50p3big75	RELANCE	cmtrb23hw000l04g57uj226l1	2026-09-07 09:24:00	TERMINE	0	\N	\N	\N	{"ordre": 3}	demo-travail-cmtrb23hw000l04g57uj226l1	2026-09-07 13:57:39.26	2026-09-07 13:57:49.641
cmtrb24az002004g5ckixjr0k	RELANCE	cmtrb23sb000t04g5d4up9gy7	2026-09-07 12:24:00	TERMINE	0	\N	\N	\N	{"ordre": 2}	demo-travail-cmtrb23sb000t04g5d4up9gy7	2026-09-07 13:57:39.275	2026-09-07 13:57:49.741
cmttzpa830006w8g5q2gtleow	RELANCE	cmtsgoav2002fy4g5otcyvmwt	2026-08-14 11:32:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoav2002fy4g5otcyvmwt-RELANCE-2026-08-14T11:32:56.000Z	2026-09-09 11:03:03.171	2026-09-09 11:19:41.547
cmtu0aq490011h0g506aig7zp	RELANCE	cmtsgoi0v004xy4g5edx8sum0	2026-09-09 11:19:41.547	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoi0v004xy4g5edx8sum0-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.545	2026-09-10 18:47:08.555
cmtvvpyl9000us4g5m1mtzwuj	ARCHIVAGE	cmtsgoi0v004xy4g5edx8sum0	2026-09-18 08:00:00	EN_ATTENTE	0	\N	\N	\N	\N	cmtsgoi0v004xy4g5edx8sum0-ARCHIVAGE-2026-09-18T08:00:00.000Z	2026-09-10 18:47:08.637	\N
cmtvvpyp9000ws4g5xfne1snq	TRANSFERT	cmtvvpxvk000os4g5nutihx80	2026-09-10 18:47:08.777	TERMINE	0	\N	\N	\N	{"uid": 4550, "messageId": "<mailflow-e2e-1789066018252@client-externe.example>", "sourceMailbox": "dec@samko.group", "destinationMailbox": "mamounberthe@gmail.com"}	cmtvvpxvk000os4g5nutihx80-transfer-<mailflow-e2e-1789066018252@client-externe.example>-mamounberthe@gmail.com	2026-09-10 18:47:08.781	2026-09-10 18:47:13.453
cmtsm6wxh001oqsg5f7m8yqg6	RELANCE	cmtsgoewx0041y4g57zq8vadx	2026-08-18 11:25:36	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoewx0041y4g57zq8vadx-RELANCE-2026-08-18T11:25:36.000Z	2026-09-08 11:57:04.949	2026-09-09 11:03:03.484
cmtsm6wyl001uqsg5yqbfgahf	RELANCE	cmtsgofgo0047y4g5szcewaov	2026-08-18 11:26:18	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgofgo0047y4g5szcewaov-RELANCE-2026-08-18T11:26:18.000Z	2026-09-08 11:57:04.989	2026-09-09 11:03:03.587
cmtsm6wz4001xqsg599f8w3te	RELANCE	cmtsgofu5004ay4g5hdd3rvxy	2026-08-18 15:36:16	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgofu5004ay4g5hdd3rvxy-RELANCE-2026-08-18T15:36:16.000Z	2026-09-08 11:57:05.008	2026-09-09 11:03:03.638
cmtsm6x2j002cqsg59va8w2k9	RELANCE	cmtrrep3w000b7gg5x9obo8vt	2026-09-07 11:12:08	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrep3w000b7gg5x9obo8vt-RELANCE-2026-09-07T11:12:08.000Z	2026-09-08 11:57:05.131	2026-09-09 11:03:03.774
cmtsm6x3q002iqsg5wmnqkiet	RELANCE	cmtrrev41000h7gg5pz5mbfwy	2026-09-07 11:15:11	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrev41000h7gg5pz5mbfwy-RELANCE-2026-09-07T11:15:11.000Z	2026-09-08 11:57:05.174	2026-09-09 11:03:03.901
cmtsm6x4w002oqsg5wwamo4sr	RELANCE	cmtrrf0hv000n7gg5wju6b06i	2026-09-09 13:14:43	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrf0hv000n7gg5wju6b06i-RELANCE-2026-09-09T13:14:43.000Z	2026-09-08 11:57:05.216	2026-09-09 11:03:03.988
cmtsm6x62002uqsg54b7pt63k	RELANCE	cmtrrf6kk000t7gg5u55w0fxz	2026-09-09 13:30:43	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrf6kk000t7gg5u55w0fxz-RELANCE-2026-09-09T13:30:43.000Z	2026-09-08 11:57:05.258	2026-09-09 11:03:04.088
cmtsm6x9g0039qsg5an9k9wyl	RELANCE	cmtsgo4kh0004y4g5x8cb73ha	2026-08-07 14:50:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo4kh0004y4g5x8cb73ha-RELANCE-2026-08-07T14:50:56.000Z	2026-09-08 11:57:05.38	2026-09-09 11:03:04.311
cmtsm6xaq003fqsg5jz68zim7	RELANCE	cmtsgo56k000ay4g5a8doxgqa	2026-08-07 14:53:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo56k000ay4g5a8doxgqa-RELANCE-2026-08-07T14:53:56.000Z	2026-09-08 11:57:05.426	2026-09-09 11:03:04.403
cmtsm6xi5004cqsg5gi5zaden	RELANCE	cmtsgo8nk001fy4g5y2djv750	2026-08-12 10:48:04	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8nk001fy4g5y2djv750-RELANCE-2026-08-12T10:48:04.000Z	2026-09-08 11:57:05.693	2026-09-09 11:03:04.64
cmtsm6xlo004xqsg5k93p94jk	RELANCE	cmtsgoh17004jy4g57156xepl	2026-08-19 10:35:26	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoh17004jy4g57156xepl-RELANCE-2026-08-19T10:35:26.000Z	2026-09-08 11:57:05.82	2026-09-09 11:03:04.675
cmtsm6xm80050qsg5un864e6d	RELANCE	cmtsgohc9004my4g57fmr5v9q	2026-08-19 10:35:26	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgohc9004my4g57fmr5v9q-RELANCE-2026-08-19T10:35:26.000Z	2026-09-08 11:57:05.84	2026-09-09 11:03:04.709
cmtsm6xoi005cqsg5rx80otv4	RELANCE	cmtsgoibf0051y4g5b69jmta2	2026-08-21 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoibf0051y4g5b69jmta2-RELANCE-2026-08-21T08:00:00.000Z	2026-09-08 11:57:05.922	2026-09-09 11:03:04.788
cmtsm6xrx005xqsg55n6gyddo	RELANCE	cmtsgokbk005ny4g5fgf1dhz8	2026-08-21 10:50:33	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgokbk005ny4g5fgf1dhz8-RELANCE-2026-08-21T10:50:33.000Z	2026-09-08 11:57:06.045	2026-09-09 11:03:04.968
cmtsm6xt40063qsg515vd7ai8	RELANCE	cmtsgokvz005ty4g56ymkf1te	2026-08-21 10:53:13	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgokvz005ty4g56ymkf1te-RELANCE-2026-08-21T10:53:13.000Z	2026-09-08 11:57:06.088	2026-09-09 11:03:05.039
cmtsm6xtm0066qsg5nutknc8e	RELANCE	cmtsgol74005wy4g50b3axzfw	2026-08-21 10:53:14	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgol74005wy4g50b3axzfw-RELANCE-2026-08-21T10:53:14.000Z	2026-09-08 11:57:06.106	2026-09-09 11:03:05.078
cmtsm6xu40069qsg5izf4ma19	RELANCE	cmtsgolgs005zy4g5nchb02i5	2026-08-21 11:30:53	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgolgs005zy4g5nchb02i5-RELANCE-2026-08-21T11:30:53.000Z	2026-09-08 11:57:06.124	2026-09-09 11:03:05.124
cmtsm6xuq006cqsg5b6x5wea5	RELANCE	cmtsgolq50062y4g56iitl3w0	2026-08-21 11:31:32	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgolq50062y4g56iitl3w0-RELANCE-2026-08-21T11:31:32.000Z	2026-09-08 11:57:06.146	2026-09-09 11:03:05.158
cmtsm6x0t0023qsg58kr2v3il	RELANCE	cmtrrehgl00017gg5c6lkpi6n	2026-09-07 08:21:52	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrehgl00017gg5c6lkpi6n-RELANCE-2026-09-07T08:21:52.000Z	2026-09-08 11:57:05.069	2026-09-09 11:03:06.077
cmtsm6x1c0026qsg5j3zj2lli	RELANCE	cmtrrekia00047gg58eak12v9	2026-09-07 08:21:52	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrekia00047gg58eak12v9-RELANCE-2026-09-07T08:21:52.000Z	2026-09-08 11:57:05.088	2026-09-09 11:03:06.114
cmtsm6x6s002xqsg5utzmt3if	RELANCE	cmtrrf8x8000w7gg5sncdibo2	2026-09-09 13:32:44	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrf8x8000w7gg5sncdibo2-RELANCE-2026-09-09T13:32:44.000Z	2026-09-08 11:57:05.284	2026-09-09 11:03:06.154
cmtsm6x7w0033qsg5c0b5i31u	RELANCE	cmtrrfdn400137gg55rf4lfit	2026-09-10 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrfdn400137gg55rf4lfit-RELANCE-2026-09-10T08:00:00.000Z	2026-09-08 11:57:05.325	2026-09-09 11:03:06.204
cmtsm6xqd005oqsg5pjn283x4	RELANCE	cmtsgojih005ey4g5bcsh395t	2026-08-21 10:48:52	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgojih005ey4g5bcsh395t-RELANCE-2026-08-21T10:48:52.000Z	2026-09-08 11:57:05.989	2026-09-09 11:03:06.253
cmtsm6xqv005rqsg57dfszsuz	RELANCE	cmtsgojss005hy4g543n81men	2026-08-21 10:50:13	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgojss005hy4g543n81men-RELANCE-2026-08-21T10:50:13.000Z	2026-09-08 11:57:06.007	2026-09-09 11:03:06.292
cmtrb24b3002104g5v38uzpf6	RELANCE	cmtrb23td000w04g5nkqkl1r1	2026-09-08 10:23:05.034	ANNULE	0	envoi refusé · relance 2 · n° 64 · hors liste blanche : seydou.coulibaly@exemple-mining.ml	\N	\N	{"ordre": 2}	demo-travail-cmtrb23td000w04g5nkqkl1r1	2026-09-07 13:57:39.279	2026-09-09 11:19:41.547
cmtvx5hcf0008h8g5nqhwbc1z	TRANSFERT	cmtvx5gke0003h8g5n2fufqi6	2026-09-10 19:27:12.395	TERMINE	0	\N	\N	\N	{"uid": 4552, "messageId": "<mailflow-e2e-1789068425614@client-externe.example>", "sourceMailbox": "dec@samko.group", "destinationMailbox": "mamounberthe@gmail.com"}	cmtvx5gke0003h8g5n2fufqi6-transfer-<mailflow-e2e-1789068425614@client-externe.example>-mamounberthe@gmail.com	2026-09-10 19:27:12.399	2026-09-10 19:27:17.472
cmtsm6wv3001fqsg5g7a01ytu	RELANCE	cmtsgodwd003ry4g50ov00o56	2026-08-17 11:38:34	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgodwd003ry4g50ov00o56-RELANCE-2026-08-17T11:38:34.000Z	2026-09-08 11:57:04.863	2026-09-09 11:03:03.377
cmtsm6wwt001lqsg5bdebsypw	RELANCE	cmtsgoen0003yy4g5wyanze9i	2026-08-18 11:25:16	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoen0003yy4g5wyanze9i-RELANCE-2026-08-18T11:25:16.000Z	2026-09-08 11:57:04.925	2026-09-09 11:03:03.433
cmtsm6wy1001rqsg5s29em8c9	RELANCE	cmtsgof5x0044y4g5cpswnx1h	2026-08-18 11:25:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgof5x0044y4g5cpswnx1h-RELANCE-2026-08-18T11:25:56.000Z	2026-09-08 11:57:04.969	2026-09-09 11:03:03.535
cmtsm6wzp0020qsg58o2u1f55	RELANCE	cmtsgoga6004dy4g5m91sslcc	2026-08-18 17:05:46	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoga6004dy4g5m91sslcc-RELANCE-2026-08-18T17:05:46.000Z	2026-09-08 11:57:05.029	2026-09-09 11:03:03.682
cmtsm6x200029qsg5ftjh567v	RELANCE	cmtrremyx00077gg58sd1lvbc	2026-09-07 08:22:13	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrremyx00077gg58sd1lvbc-RELANCE-2026-09-07T08:22:13.000Z	2026-09-08 11:57:05.112	2026-09-09 11:03:03.731
cmtsm6x33002fqsg5gz5ow6uq	RELANCE	cmtrrerri000e7gg5kcbczxkv	2026-09-07 11:13:51	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrerri000e7gg5kcbczxkv-RELANCE-2026-09-07T11:13:51.000Z	2026-09-08 11:57:05.151	2026-09-09 11:03:03.86
cmtsm6x48002lqsg5pae8qwvl	RELANCE	cmtrrexyq000k7gg5fion4por	2026-09-09 13:13:44	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrexyq000k7gg5fion4por-RELANCE-2026-09-09T13:13:44.000Z	2026-09-08 11:57:05.192	2026-09-09 11:03:03.943
cmtsm6x5f002rqsg5z5t33uhi	RELANCE	cmtrrf3ht000q7gg5rgb7h7im	2026-09-09 13:15:44	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrf3ht000q7gg5rgb7h7im-RELANCE-2026-09-09T13:15:44.000Z	2026-09-08 11:57:05.235	2026-09-09 11:03:04.042
cmtsm6x7b0030qsg5i7ruif0l	RELANCE	cmtrrfbbm000z7gg5btt0mkpo	2026-09-09 13:34:23	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrfbbm000z7gg5btt0mkpo-RELANCE-2026-09-09T13:34:23.000Z	2026-09-08 11:57:05.303	2026-09-09 11:03:04.218
cmtsm6xa2003cqsg5xy41q40s	RELANCE	cmtsgo4vh0007y4g5gd9j9x9j	2026-08-07 14:53:55	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo4vh0007y4g5gd9j9x9j-RELANCE-2026-08-07T14:53:55.000Z	2026-09-08 11:57:05.402	2026-09-09 11:03:04.354
cmtsm6xc3003lqsg5limz3nu8	RELANCE	cmtsgo5sm000gy4g5gnj7agvp	2026-08-10 16:47:05	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo5sm000gy4g5gnj7agvp-RELANCE-2026-08-10T16:47:05.000Z	2026-09-08 11:57:05.475	2026-09-09 11:03:04.494
cmtsm6xep003uqsg542xuwyq0	RELANCE	cmtsgo6v3000sy4g54o1w189t	2026-08-11 09:46:15	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo6v3000sy4g54o1w189t-RELANCE-2026-08-11T09:46:15.000Z	2026-09-08 11:57:05.569	2026-09-09 11:03:04.527
cmtsm6xft0040qsg5ubhwsrxv	RELANCE	cmtsgo7hy000zy4g50gkk03su	2026-08-11 12:02:57	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo7hy000zy4g50gkk03su-RELANCE-2026-08-11T12:02:57.000Z	2026-09-08 11:57:05.609	2026-09-09 11:03:04.56
cmtsm6xhh0049qsg5x78cmn5b	RELANCE	cmtsgo8ce001cy4g5wr4aw71m	2026-08-12 10:47:43	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8ce001cy4g5wr4aw71m-RELANCE-2026-08-12T10:47:43.000Z	2026-09-08 11:57:05.669	2026-09-09 11:03:04.6
cmtsm6xmq0053qsg5n74l70fo	RELANCE	cmtsgohm5004py4g5tvc42ntd	2026-08-19 10:57:27	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgohm5004py4g5tvc42ntd-RELANCE-2026-08-19T10:57:27.000Z	2026-09-08 11:57:05.858	2026-09-09 11:03:04.748
cmtsm6xph005iqsg5smllc9jr	RELANCE	cmtsgoixy0058y4g5xrzh9w0f	2026-08-21 10:48:12	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoixy0058y4g5xrzh9w0f-RELANCE-2026-08-21T10:48:12.000Z	2026-09-08 11:57:05.957	2026-09-09 11:03:04.829
cmtsm6xpx005lqsg5a1jl57k2	RELANCE	cmtsgoj7i005by4g53nudad4y	2026-08-21 10:48:32	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoj7i005by4g53nudad4y-RELANCE-2026-08-21T10:48:32.000Z	2026-09-08 11:57:05.973	2026-09-09 11:03:04.879
cmtsm6xrd005uqsg5e7o696ns	RELANCE	cmtsgok1z005ky4g5y1bwph9e	2026-08-21 10:50:33	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgok1z005ky4g5y1bwph9e-RELANCE-2026-08-21T10:50:33.000Z	2026-09-08 11:57:06.025	2026-09-09 11:03:04.923
cmtsm6xsm0060qsg53rvatc91	RELANCE	cmtsgoklf005qy4g57pfwoe4i	2026-08-21 10:52:53	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoklf005qy4g57pfwoe4i-RELANCE-2026-08-21T10:52:53.000Z	2026-09-08 11:57:06.07	2026-09-09 11:03:05.002
cmtsm6xvt006iqsg5mrcf8olk	RELANCE	cmtsgomab0068y4g53n6axff9	2026-08-25 11:07:32	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgomab0068y4g53n6axff9-RELANCE-2026-08-25T11:07:32.000Z	2026-09-08 11:57:06.185	2026-09-09 11:03:05.234
cmtsm6xww006oqsg5adiaxzq6	RELANCE	cmtsgomul006ey4g5117dmr5k	2026-08-25 11:41:53	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgomul006ey4g5117dmr5k-RELANCE-2026-08-25T11:41:53.000Z	2026-09-08 11:57:06.224	2026-09-09 11:03:05.274
cmtsm6xxi006rqsg5y6my0pxu	RELANCE	cmtsgon5n006hy4g5jng7aybn	2026-08-25 11:41:55	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgon5n006hy4g5jng7aybn-RELANCE-2026-08-25T11:41:55.000Z	2026-09-08 11:57:06.246	2026-09-09 11:03:05.317
cmtsm6xzk0073qsg5j77q10c6	RELANCE	cmtsgoo96006wy4g59j3m9a3u	2026-08-26 08:36:39	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoo96006wy4g59j3m9a3u-RELANCE-2026-08-26T08:36:39.000Z	2026-09-08 11:57:06.32	2026-09-09 11:03:05.439
cmtsm6wpe000oqsg5qk5aiqy0	RELANCE	cmtsgoc2p002ry4g54pc4cjw3	2026-08-13 11:49:15	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoc2p002ry4g54pc4cjw3-RELANCE-2026-08-13T11:49:15.000Z	2026-09-08 11:57:04.658	2026-09-09 11:03:05.873
cmtsm6xdo003rqsg5ohv41ga3	RELANCE	cmtsgo6js000py4g5a2i13st2	2026-08-11 09:45:35	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo6js000py4g5a2i13st2-RELANCE-2026-08-11T09:45:35.000Z	2026-09-08 11:57:05.532	2026-09-09 11:03:05.916
cmtsm6xfa003xqsg5ep1mhvk9	RELANCE	cmtsgo76s000vy4g5ngcmixeb	2026-08-11 09:46:35	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo76s000vy4g5ngcmixeb-RELANCE-2026-08-11T09:46:35.000Z	2026-09-08 11:57:05.59	2026-09-09 11:03:05.956
cmtrb24bf002304g5q3shk399	RELANCE	cmtrb23v9001104g5ixlv9erv	2026-09-08 10:23:05.205	ANNULE	0	envoi refusé · relance 1 · n° 66 · hors liste blanche : fatoumata.diallo@exemple-mining.ml	\N	\N	{"ordre": 1}	demo-travail-cmtrb23v9001104g5ixlv9erv	2026-09-07 13:57:39.291	2026-09-09 11:19:41.547
cmtsm6wor000lqsg57ouguji0	RELANCE	cmtsgobrr002oy4g5nhzegcu1	2026-08-13 11:45:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgobrr002oy4g5nhzegcu1-RELANCE-2026-08-13T11:45:56.000Z	2026-09-08 11:57:04.635	2026-09-09 11:03:03.321
cmttzpatv001fw8g5vquqr8uk	RELANCE	cmtrrexyq000k7gg5fion4por	2026-09-10 13:13:44	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrexyq000k7gg5fion4por-RELANCE-2026-09-10T13:13:44.000Z	2026-09-09 11:03:03.955	\N
cmttzpawn001lw8g56g0snnad	RELANCE	cmtrrf3ht000q7gg5rgb7h7im	2026-09-10 13:15:44	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrf3ht000q7gg5rgb7h7im-RELANCE-2026-09-10T13:15:44.000Z	2026-09-09 11:03:04.055	\N
cmtsm6bxj000314g58h6jjymo	RELANCE	cmtrb2400001b04g52crh2evj	2026-09-09 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrb2400001b04g52crh2evj-RELANCE-2026-09-09T08:00:00.000Z	2026-09-08 11:56:37.735	2026-09-09 11:03:04.131
cmttzpaz2001rw8g5a8kl75m6	RELANCE	cmtrb2400001b04g52crh2evj	2026-09-10 08:00:00	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrb2400001b04g52crh2evj-RELANCE-2026-09-10T08:00:00.000Z	2026-09-09 11:03:04.143	\N
cmttzpb1i001xw8g5qqo9aoso	RELANCE	cmtrrfbbm000z7gg5btt0mkpo	2026-09-10 13:34:23	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrfbbm000z7gg5btt0mkpo-RELANCE-2026-09-10T13:34:23.000Z	2026-09-09 11:03:04.23	\N
cmtsm6xva006fqsg5g1orsp4z	RELANCE	cmtsgolzx0065y4g50uyrdnql	2026-08-25 10:52:41	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgolzx0065y4g50uyrdnql-RELANCE-2026-08-25T10:52:41.000Z	2026-09-08 11:57:06.166	2026-09-09 11:03:05.196
cmtsm6xy1006uqsg52md84uym	RELANCE	cmtsgongf006ky4g5pn70rj2w	2026-08-25 11:42:24	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgongf006ky4g5pn70rj2w-RELANCE-2026-08-25T11:42:24.000Z	2026-09-08 11:57:06.265	2026-09-09 11:03:05.358
cmtsm6xyj006xqsg5qihdup54	RELANCE	cmtsgonqp006ny4g5rzwzii5w	2026-08-25 14:29:57	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgonqp006ny4g5rzwzii5w-RELANCE-2026-08-25T14:29:57.000Z	2026-09-08 11:57:06.283	2026-09-09 11:03:05.398
cmtsm6y020076qsg5ua5b667u	RELANCE	cmtsgookg006zy4g526oxyyo4	2026-08-26 08:36:59	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgookg006zy4g526oxyyo4-RELANCE-2026-08-26T08:36:59.000Z	2026-09-08 11:57:06.338	2026-09-09 11:03:05.48
cmtsm6y2i007iqsg5pyhddlpm	RELANCE	cmtsgops1007by4g5w90fho1y	2026-08-26 08:37:39	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgops1007by4g5w90fho1y-RELANCE-2026-08-26T08:37:39.000Z	2026-09-08 11:57:06.426	2026-09-09 11:03:05.607
cmtsm6y3l007oqsg58kt65rzf	RELANCE	cmtsgoqkj007hy4g55xpgfcot	2026-08-31 12:10:18	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoqkj007hy4g55xpgfcot-RELANCE-2026-08-31T12:10:18.000Z	2026-09-08 11:57:06.465	2026-09-09 11:03:05.713
cmtsm6y5q0080qsg5xt14xes1	RELANCE	cmtsgorp1007xy4g5w3b0mokg	2026-09-07 08:21:32	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgorp1007xy4g5w3b0mokg-RELANCE-2026-09-07T08:21:32.000Z	2026-09-08 11:57:06.542	2026-09-09 11:03:05.829
cmtsm6xwa006lqsg5hwmvvib6	RELANCE	cmtsgomkf006by4g5kk5bp1xm	2026-08-25 11:41:52	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgomkf006by4g5kk5bp1xm-RELANCE-2026-08-25T11:41:52.000Z	2026-09-08 11:57:06.202	2026-09-09 11:03:06.329
cmtsm6y4p007uqsg57qreys31	RELANCE	cmtsgor2c007py4g5jawyc6x9	2026-09-03 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgor2c007py4g5jawyc6x9-RELANCE-2026-09-03T08:00:00.000Z	2026-09-08 11:57:06.505	2026-09-09 11:03:06.405
cmttzpab5000cw8g5hho2tjzy	RELANCE	cmtsgobga002ly4g5rk9g0koh	2026-08-14 11:43:55	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgobga002ly4g5rk9g0koh-RELANCE-2026-08-14T11:43:55.000Z	2026-09-09 11:03:03.281	2026-09-09 11:19:41.547
cmttzpaxw001ow8g528m4pkou	RELANCE	cmtrrf6kk000t7gg5u55w0fxz	2026-09-10 13:30:43	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrf6kk000t7gg5u55w0fxz-RELANCE-2026-09-10T13:30:43.000Z	2026-09-09 11:03:04.1	\N
cmtsm6x8s0036qsg5bhz8qokx	RELANCE	cmtsgo43i0001y4g59imk5k28	2026-08-07 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo43i0001y4g59imk5k28-RELANCE-2026-08-07T08:00:00.000Z	2026-09-08 11:57:05.356	2026-09-09 11:03:04.263
cmtsm6xbe003iqsg5ro7srgnk	RELANCE	cmtsgo5i0000dy4g56et0z1vf	2026-08-10 14:31:54	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo5i0000dy4g56et0z1vf-RELANCE-2026-08-10T14:31:54.000Z	2026-09-08 11:57:05.45	2026-09-09 11:03:04.45
cmtsm6y0i0079qsg5x2fzn54z	RELANCE	cmtsgoow30072y4g54mwgg1wv	2026-08-26 08:37:19	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoow30072y4g54mwgg1wv-RELANCE-2026-08-26T08:37:19.000Z	2026-09-08 11:57:06.354	2026-09-09 11:03:05.518
cmtsm6y31007lqsg5logc2jik	RELANCE	cmtsgoq9f007ey4g5kt1ub1wm	2026-08-31 12:10:18	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoq9f007ey4g5kt1ub1wm-RELANCE-2026-08-31T12:10:18.000Z	2026-09-08 11:57:06.445	2026-09-09 11:03:05.649
cmtsm6y42007rqsg5wqxk2jek	RELANCE	cmtsgoqu7007ly4g5nlxu6s8w	2026-08-31 13:16:09	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoqu7007ly4g5nlxu6s8w-RELANCE-2026-08-31T13:16:09.000Z	2026-09-08 11:57:06.482	2026-09-09 11:03:05.752
cmtsm6y58007xqsg52zo3dkx2	RELANCE	cmtsgorcs007sy4g5e4pwr6qo	2026-09-04 10:14:18	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgorcs007sy4g5e4pwr6qo-RELANCE-2026-09-04T10:14:18.000Z	2026-09-08 11:57:06.524	2026-09-09 11:03:05.791
cmtsm6xl7004uqsg5k4ad3ymz	RELANCE	cmtsgogo7004gy4g5widtu34d	2026-08-19 09:51:06	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgogo7004gy4g5widtu34d-RELANCE-2026-08-19T09:51:06.000Z	2026-09-08 11:57:05.803	2026-09-09 11:03:05.997
cmttzpcjc005uw8g5vnp8aia2	RELANCE	cmtrrf8x8000w7gg5sncdibo2	2026-09-10 13:32:44	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrf8x8000w7gg5sncdibo2-RELANCE-2026-09-10T13:32:44.000Z	2026-09-09 11:03:06.168	\N
cmttzpae9000iw8g5xsjdufv9	RELANCE	cmtsgodwd003ry4g50ov00o56	2026-08-14 11:38:34	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgodwd003ry4g50ov00o56-RELANCE-2026-08-14T11:38:34.000Z	2026-09-09 11:03:03.393	2026-09-09 11:19:41.547
cmttzpah6000ow8g5fc412is9	RELANCE	cmtsgoewx0041y4g57zq8vadx	2026-08-19 11:25:36	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoewx0041y4g57zq8vadx-RELANCE-2026-08-19T11:25:36.000Z	2026-09-09 11:03:03.498	2026-09-09 11:19:41.547
cmttzpak1000uw8g5spt9gy0e	RELANCE	cmtsgofgo0047y4g5szcewaov	2026-08-19 11:26:18	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgofgo0047y4g5szcewaov-RELANCE-2026-08-19T11:26:18.000Z	2026-09-09 11:03:03.601	2026-09-09 11:19:41.547
cmttzpamm0010w8g5hwzmtmfn	RELANCE	cmtsgoga6004dy4g5m91sslcc	2026-08-19 17:05:46	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoga6004dy4g5m91sslcc-RELANCE-2026-08-19T17:05:46.000Z	2026-09-09 11:03:03.694	2026-09-09 11:19:41.547
cmttzpaq70016w8g5zopn37lw	RELANCE	cmtrrep3w000b7gg5x9obo8vt	2026-09-04 11:12:08	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrep3w000b7gg5x9obo8vt-RELANCE-2026-09-04T11:12:08.000Z	2026-09-09 11:03:03.823	2026-09-09 11:19:41.547
cmttzpaso001cw8g50huln0yu	RELANCE	cmtrrev41000h7gg5pz5mbfwy	2026-09-08 11:15:11	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrev41000h7gg5pz5mbfwy-RELANCE-2026-09-08T11:15:11.000Z	2026-09-09 11:03:03.912	2026-09-09 11:19:41.547
cmtsm6bub000014g5v1r393fr	RELANCE	cmtrb23zd001904g59cyl5atc	2026-09-09 08:24:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrb23zd001904g59cyl5atc-RELANCE-2026-09-09T08:24:00.000Z	2026-09-08 11:56:37.62	2026-09-09 11:19:41.547
cmtsm6wig0000qsg534u9v230	RELANCE	cmtsgo9nf0023y4g5ox3bvpeg	2026-08-13 10:55:50	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo9nf0023y4g5ox3bvpeg-RELANCE-2026-08-13T10:55:50.000Z	2026-09-08 11:57:04.408	2026-09-09 11:19:41.547
cmtrb24ba002204g5pu8opyk0	RELANCE	cmtrb23ua000z04g5180m4y5p	2026-09-08 10:24:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	demo-travail-cmtrb23ua000z04g5180m4y5p	2026-09-07 13:57:39.286	2026-09-09 11:19:41.547
cmtrb24bj002404g5x71woy7s	RELANCE	cmtrb23wh001304g5k77we3z4	2026-09-09 10:24:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	demo-travail-cmtrb23wh001304g5k77we3z4	2026-09-07 13:57:39.295	2026-09-09 11:19:41.547
cmtrb24bx002604g5ih9j0ff9	RELANCE	cmtrb23yh001704g5kjlzolmu	2026-09-08 16:24:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	demo-travail-cmtrb23yh001704g5kjlzolmu	2026-09-07 13:57:39.309	2026-09-09 11:19:41.547
cmtrb2c9c0000xsg5kglkcuu0	ESCALADE	cmtrb23hw000l04g57uj226l1	2026-09-08 13:57:49.069	ANNULE	0	\N	\N	\N	\N	cmtrb23hw000l04g57uj226l1-ESCALADE-2026-09-08T13:57:49.069Z	2026-09-07 13:57:49.584	2026-09-09 11:19:41.547
cmtrb2cco0003xsg5oxplcscm	ESCALADE	cmtrb23sb000t04g5d4up9gy7	2026-09-08 13:57:49.655	ANNULE	0	\N	\N	\N	\N	cmtrb23sb000t04g5d4up9gy7-ESCALADE-2026-09-08T13:57:49.655Z	2026-09-07 13:57:49.704	2026-09-09 11:19:41.547
cmtsm6wq2000rqsg5qbu5z0wi	RELANCE	cmtsgoc80002vy4g5sebz4w09	2026-08-13 12:37:13	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoc80002vy4g5sebz4w09-RELANCE-2026-08-13T12:37:13.000Z	2026-09-08 11:57:04.682	2026-09-09 11:19:41.547
cmtsm6wrp000xqsg50t1fn48f	RELANCE	cmtsgocij0033y4g5nz5cvmya	2026-08-13 12:45:27	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgocij0033y4g5nz5cvmya-RELANCE-2026-08-13T12:45:27.000Z	2026-09-08 11:57:04.741	2026-09-09 11:19:41.547
cmtsm6wtj0016qsg5ohc5w31s	RELANCE	cmtsgod1p003fy4g5l8pb2dxb	2026-08-13 14:57:18	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgod1p003fy4g5l8pb2dxb-RELANCE-2026-08-13T14:57:18.000Z	2026-09-08 11:57:04.807	2026-09-09 11:19:41.547
cmtsm6wuj001cqsg5ifdj22zr	RELANCE	cmtsgodks003ny4g57hptcv1r	2026-08-14 17:29:36	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgodks003ny4g57hptcv1r-RELANCE-2026-08-14T17:29:36.000Z	2026-09-08 11:57:04.843	2026-09-09 11:19:41.547
cmtsm6wvp001iqsg5msk2l1eu	RELANCE	cmtsgoebk003vy4g5ym4m5h68	2026-08-18 08:33:22	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoebk003vy4g5ym4m5h68-RELANCE-2026-08-18T08:33:22.000Z	2026-09-08 11:57:04.885	2026-09-09 11:19:41.547
cmtsm6xgf0043qsg5wa8obm31	RELANCE	cmtsgo7u60015y4g5ricbvq34	2026-08-11 12:35:20	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo7u60015y4g5ricbvq34-RELANCE-2026-08-11T12:35:20.000Z	2026-09-08 11:57:05.631	2026-09-09 11:19:41.547
cmtsm6xgy0046qsg5sev2ir1a	RELANCE	cmtsgo80n0019y4g50195ckf2	2026-08-12 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo80n0019y4g50195ckf2-RELANCE-2026-08-12T08:00:00.000Z	2026-09-08 11:57:05.65	2026-09-09 11:19:41.547
cmtsm6xip004fqsg5o3kiyeql	RELANCE	cmtsgo8tq001jy4g5e65cesvz	2026-08-12 14:34:28	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8tq001jy4g5e65cesvz-RELANCE-2026-08-12T14:34:28.000Z	2026-09-08 11:57:05.713	2026-09-09 11:19:41.547
cmtsm6xjr004lqsg54feybymy	RELANCE	cmtsgo94n001ry4g5dew9pp80	2026-08-13 10:44:14	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo94n001ry4g5dew9pp80-RELANCE-2026-08-13T10:44:14.000Z	2026-09-08 11:57:05.751	2026-09-09 11:19:41.547
cmtsm6xkq004rqsg5x3i4rxac	RELANCE	cmtsgo9h8001zy4g5t5nhwimp	2026-08-13 10:54:49	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo9h8001zy4g5t5nhwimp-RELANCE-2026-08-13T10:54:49.000Z	2026-09-08 11:57:05.786	2026-09-09 11:19:41.547
cmtsm6xnd0056qsg58chntpbs	RELANCE	cmtsgohs3004ty4g5meanvzxr	2026-08-19 10:58:54	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgohs3004ty4g5meanvzxr-RELANCE-2026-08-19T10:58:54.000Z	2026-09-08 11:57:05.881	2026-09-09 11:19:41.547
cmtsm6xp1005fqsg5fi0e1d2t	RELANCE	cmtsgoime0055y4g5wo86qqpx	2026-08-21 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoime0055y4g5wo86qqpx-RELANCE-2026-08-21T08:00:00.000Z	2026-09-08 11:57:05.941	2026-09-09 11:19:41.547
cmtsm6wqq000uqsg5yuasnhjx	RELANCE	cmtsgocd9002zy4g5sadj4hh5	2026-08-13 12:37:20	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgocd9002zy4g5sadj4hh5-RELANCE-2026-08-13T12:37:20.000Z	2026-09-08 11:57:04.706	2026-09-09 11:19:41.547
cmtsm6wsa0010qsg5621h1wny	RELANCE	cmtsgocne0037y4g5jie9rcwi	2026-08-13 12:46:06	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgocne0037y4g5jie9rcwi-RELANCE-2026-08-13T12:46:06.000Z	2026-09-08 11:57:04.762	2026-09-09 11:19:41.547
cmtsm6wsw0013qsg5iis76ysx	RELANCE	cmtsgocsb003by4g54pv0m36r	2026-08-13 12:46:30	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgocsb003by4g54pv0m36r-RELANCE-2026-08-13T12:46:30.000Z	2026-09-08 11:57:04.784	2026-09-09 11:19:41.547
cmtsm6wu20019qsg565zs7kcb	RELANCE	cmtsgod9y003jy4g5qkwtv9q8	2026-08-14 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgod9y003jy4g5qkwtv9q8-RELANCE-2026-08-14T08:00:00.000Z	2026-09-08 11:57:04.826	2026-09-09 11:19:41.547
cmtsm6xcv003oqsg5j48uwchu	RELANCE	cmtsgo67d000ky4g5vu29ykrw	2026-08-10 17:59:57	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo67d000ky4g5vu29ykrw-RELANCE-2026-08-10T17:59:57.000Z	2026-09-08 11:57:05.503	2026-09-09 11:19:41.547
cmtsm6y1j007fqsg5x9osxk9r	RELANCE	cmtsgopho0078y4g516epj1n5	2026-08-26 08:37:39	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgopho0078y4g516epj1n5-RELANCE-2026-08-26T08:37:39.000Z	2026-09-08 11:57:06.391	2026-09-09 11:03:06.038
cmtsm6y13007cqsg5fse3fke4	RELANCE	cmtsgop7m0075y4g5vvrpq4n7	2026-08-26 08:37:19	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgop7m0075y4g5vvrpq4n7-RELANCE-2026-08-26T08:37:19.000Z	2026-09-08 11:57:06.375	2026-09-09 11:03:06.365
cmtsm6xj6004iqsg5kkcraq8w	RELANCE	cmtsgo8yx001ny4g5r56lfciy	2026-08-12 14:35:16	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8yx001ny4g5r56lfciy-RELANCE-2026-08-12T14:35:16.000Z	2026-09-08 11:57:05.73	2026-09-09 11:19:41.547
cmtsm6xk9004oqsg53krqq26j	RELANCE	cmtsgo9aj001vy4g5yoia1oxg	2026-08-13 10:47:53	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo9aj001vy4g5yoia1oxg-RELANCE-2026-08-13T10:47:53.000Z	2026-09-08 11:57:05.769	2026-09-09 11:19:41.547
cmtsm6xnz0059qsg5fjf19lqm	RELANCE	cmtsgoi0v004xy4g5edx8sum0	2026-08-19 15:10:05	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoi0v004xy4g5edx8sum0-RELANCE-2026-08-19T15:10:05.000Z	2026-09-08 11:57:05.903	2026-09-09 11:19:41.547
cmtsm6xz10070qsg5vqf9xaxf	RELANCE	cmtsgonxd006ry4g5o81xamd0	2026-08-26 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgonxd006ry4g5o81xamd0-RELANCE-2026-08-26T08:00:00.000Z	2026-09-08 11:57:06.301	2026-09-09 11:19:41.547
cmttzpa6a0003w8g5ja1mbgqm	RELANCE	cmtsgoakd002cy4g56ysi0yfp	2026-08-14 11:32:16	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoakd002cy4g56ysi0yfp-RELANCE-2026-08-14T11:32:16.000Z	2026-09-09 11:03:03.106	2026-09-09 11:19:41.547
cmttzpa9o0009w8g5ipdpehoa	RELANCE	cmtsgob5v002iy4g5xd5u2h8a	2026-08-14 11:40:17	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgob5v002iy4g5xd5u2h8a-RELANCE-2026-08-14T11:40:17.000Z	2026-09-09 11:03:03.228	2026-09-09 11:19:41.547
cmttzpaco000fw8g527prxva2	RELANCE	cmtsgobrr002oy4g5nhzegcu1	2026-08-14 11:45:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgobrr002oy4g5nhzegcu1-RELANCE-2026-08-14T11:45:56.000Z	2026-09-09 11:03:03.336	2026-09-09 11:19:41.547
cmttzpafs000lw8g5igqm3p6n	RELANCE	cmtsgoen0003yy4g5wyanze9i	2026-08-19 11:25:16	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoen0003yy4g5wyanze9i-RELANCE-2026-08-19T11:25:16.000Z	2026-09-09 11:03:03.448	2026-09-09 11:19:41.547
cmttzpain000rw8g5qxyigt7v	RELANCE	cmtsgof5x0044y4g5cpswnx1h	2026-08-19 11:25:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgof5x0044y4g5cpswnx1h-RELANCE-2026-08-19T11:25:56.000Z	2026-09-09 11:03:03.551	2026-09-09 11:19:41.547
cmttzpale000xw8g515f6cd8l	RELANCE	cmtsgofu5004ay4g5hdd3rvxy	2026-08-19 15:36:16	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgofu5004ay4g5hdd3rvxy-RELANCE-2026-08-19T15:36:16.000Z	2026-09-09 11:03:03.65	2026-09-09 11:19:41.547
cmttzpao10013w8g576a7e3xn	RELANCE	cmtrremyx00077gg58sd1lvbc	2026-09-08 08:22:13	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrremyx00077gg58sd1lvbc-RELANCE-2026-09-08T08:22:13.000Z	2026-09-09 11:03:03.745	2026-09-09 11:19:41.547
cmttzpark0019w8g50oshit5x	RELANCE	cmtrrerri000e7gg5kcbczxkv	2026-09-08 11:13:51	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrerri000e7gg5kcbczxkv-RELANCE-2026-09-08T11:13:51.000Z	2026-09-09 11:03:03.872	2026-09-09 11:19:41.547
cmttzpb430023w8g57piccfye	RELANCE	cmtsgo4kh0004y4g5x8cb73ha	2026-08-10 14:50:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo4kh0004y4g5x8cb73ha-RELANCE-2026-08-10T14:50:56.000Z	2026-09-09 11:03:04.323	2026-09-09 11:19:41.547
cmttzpb6o0029w8g53s4bj2nc	RELANCE	cmtsgo56k000ay4g5a8doxgqa	2026-08-10 14:53:56	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo56k000ay4g5a8doxgqa-RELANCE-2026-08-10T14:53:56.000Z	2026-09-09 11:03:04.416	2026-09-09 11:19:41.547
cmttzpb93002fw8g5j10fey83	RELANCE	cmtsgo5sm000gy4g5gnj7agvp	2026-08-11 16:47:05	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo5sm000gy4g5gnj7agvp-RELANCE-2026-08-11T16:47:05.000Z	2026-09-09 11:03:04.503	2026-09-09 11:19:41.547
cmttzpbaz002lw8g5pe4xnk5f	RELANCE	cmtsgo7hy000zy4g50gkk03su	2026-08-12 12:02:57	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo7hy000zy4g50gkk03su-RELANCE-2026-08-12T12:02:57.000Z	2026-09-09 11:03:04.571	2026-09-09 11:19:41.547
cmttzpbe3002uw8g5r5idpbw2	RELANCE	cmtsgoh17004jy4g57156xepl	2026-08-20 10:35:26	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoh17004jy4g57156xepl-RELANCE-2026-08-20T10:35:26.000Z	2026-09-09 11:03:04.683	2026-09-09 11:19:41.547
cmttzpbg50030w8g5yjwwmpbt	RELANCE	cmtsgohm5004py4g5tvc42ntd	2026-08-20 10:57:27	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgohm5004py4g5tvc42ntd-RELANCE-2026-08-20T10:57:27.000Z	2026-09-09 11:03:04.757	2026-09-09 11:19:41.547
cmttzpbih0036w8g5s2ryrccf	RELANCE	cmtsgoixy0058y4g5xrzh9w0f	2026-08-24 10:48:12	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoixy0058y4g5xrzh9w0f-RELANCE-2026-08-24T10:48:12.000Z	2026-09-09 11:03:04.841	2026-09-09 11:19:41.547
cmttzpbl5003cw8g5lm7r31pm	RELANCE	cmtsgok1z005ky4g5y1bwph9e	2026-08-24 10:50:33	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgok1z005ky4g5y1bwph9e-RELANCE-2026-08-24T10:50:33.000Z	2026-09-09 11:03:04.937	2026-09-09 11:19:41.547
cmttzpbm9003fw8g5zaavjk4x	RELANCE	cmtsgokbk005ny4g5fgf1dhz8	2026-08-24 10:50:33	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgokbk005ny4g5fgf1dhz8-RELANCE-2026-08-24T10:50:33.000Z	2026-09-09 11:03:04.977	2026-09-09 11:19:41.547
cmttzpbo9003lw8g5amamrpu0	RELANCE	cmtsgokvz005ty4g56ymkf1te	2026-08-24 10:53:13	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgokvz005ty4g56ymkf1te-RELANCE-2026-08-24T10:53:13.000Z	2026-09-09 11:03:05.049	2026-09-09 11:19:41.547
cmttzpbqm003rw8g50tkuxb9j	RELANCE	cmtsgolgs005zy4g5nchb02i5	2026-08-24 11:30:53	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgolgs005zy4g5nchb02i5-RELANCE-2026-08-24T11:30:53.000Z	2026-09-09 11:03:05.134	2026-09-09 11:19:41.547
cmttzpbsm003xw8g53jf5miqj	RELANCE	cmtsgolzx0065y4g50uyrdnql	2026-08-26 10:52:41	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgolzx0065y4g50uyrdnql-RELANCE-2026-08-26T10:52:41.000Z	2026-09-09 11:03:05.206	2026-09-09 11:19:41.547
cmttzpbut0043w8g5ffyq765l	RELANCE	cmtsgomul006ey4g5117dmr5k	2026-08-26 11:41:53	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgomul006ey4g5117dmr5k-RELANCE-2026-08-26T11:41:53.000Z	2026-09-09 11:03:05.285	2026-09-09 11:19:41.547
cmttzpb0a001uw8g53ujcw408	RELANCE	cmtrb240h001d04g5aua0ffc7	2026-09-08 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrb240h001d04g5aua0ffc7-RELANCE-2026-09-08T08:00:00.000Z	2026-09-09 11:03:04.186	2026-09-09 11:19:41.547
cmttzpb2r0020w8g5ffpsy7d5	RELANCE	cmtsgo43i0001y4g59imk5k28	2026-08-10 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo43i0001y4g59imk5k28-RELANCE-2026-08-10T08:00:00.000Z	2026-09-09 11:03:04.275	2026-09-09 11:19:41.547
cmttzpb5b0026w8g5uvdlfxaw	RELANCE	cmtsgo4vh0007y4g5gd9j9x9j	2026-08-10 14:53:55	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo4vh0007y4g5gd9j9x9j-RELANCE-2026-08-10T14:53:55.000Z	2026-09-09 11:03:04.367	2026-09-09 11:19:41.547
cmttzpb85002cw8g58avn8mlw	RELANCE	cmtsgo5i0000dy4g56et0z1vf	2026-08-11 14:31:54	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo5i0000dy4g56et0z1vf-RELANCE-2026-08-11T14:31:54.000Z	2026-09-09 11:03:04.469	2026-09-09 11:19:41.547
cmttzpba0002iw8g5nwui23v3	RELANCE	cmtsgo6v3000sy4g54o1w189t	2026-08-12 09:46:15	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo6v3000sy4g54o1w189t-RELANCE-2026-08-12T09:46:15.000Z	2026-09-09 11:03:04.536	2026-09-09 11:19:41.547
cmttzpbc1002ow8g5wwt31gww	RELANCE	cmtsgo8ce001cy4g5wr4aw71m	2026-08-13 10:47:43	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8ce001cy4g5wr4aw71m-RELANCE-2026-08-13T10:47:43.000Z	2026-09-09 11:03:04.609	2026-09-09 11:19:41.547
cmttzpbd5002rw8g5sokd161n	RELANCE	cmtsgo8nk001fy4g5y2djv750	2026-08-13 10:48:04	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8nk001fy4g5y2djv750-RELANCE-2026-08-13T10:48:04.000Z	2026-09-09 11:03:04.649	2026-09-09 11:19:41.547
cmttzpbf5002xw8g5f51oumkv	RELANCE	cmtsgohc9004my4g57fmr5v9q	2026-08-20 10:35:26	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgohc9004my4g57fmr5v9q-RELANCE-2026-08-20T10:35:26.000Z	2026-09-09 11:03:04.721	2026-09-09 11:19:41.547
cmttzpbh90033w8g5nk1xaiy7	RELANCE	cmtsgoibf0051y4g5b69jmta2	2026-08-24 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoibf0051y4g5b69jmta2-RELANCE-2026-08-24T08:00:00.000Z	2026-09-09 11:03:04.797	2026-09-09 11:19:41.547
cmttzpbjt0039w8g5ramd5mh6	RELANCE	cmtsgoj7i005by4g53nudad4y	2026-08-24 10:48:32	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoj7i005by4g53nudad4y-RELANCE-2026-08-24T10:48:32.000Z	2026-09-09 11:03:04.889	2026-09-09 11:19:41.547
cmttzpbnb003iw8g5si4nxsl5	RELANCE	cmtsgoklf005qy4g57pfwoe4i	2026-08-24 10:52:53	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoklf005qy4g57pfwoe4i-RELANCE-2026-08-24T10:52:53.000Z	2026-09-09 11:03:05.015	2026-09-09 11:19:41.547
cmttzpbpc003ow8g5k7lkv84s	RELANCE	cmtsgol74005wy4g50b3axzfw	2026-08-24 10:53:14	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgol74005wy4g50b3axzfw-RELANCE-2026-08-24T10:53:14.000Z	2026-09-09 11:03:05.088	2026-09-09 11:19:41.547
cmttzpbrl003uw8g5ofrf13l1	RELANCE	cmtsgolq50062y4g56iitl3w0	2026-08-24 11:31:32	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgolq50062y4g56iitl3w0-RELANCE-2026-08-24T11:31:32.000Z	2026-09-09 11:03:05.169	2026-09-09 11:19:41.547
cmttzpbtp0040w8g5i8wydx7p	RELANCE	cmtsgomab0068y4g53n6axff9	2026-08-26 11:07:32	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgomab0068y4g53n6axff9-RELANCE-2026-08-26T11:07:32.000Z	2026-09-09 11:03:05.245	2026-09-09 11:19:41.547
cmttzpbw00046w8g56radxauj	RELANCE	cmtsgon5n006hy4g5jng7aybn	2026-08-26 11:41:55	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgon5n006hy4g5jng7aybn-RELANCE-2026-08-26T11:41:55.000Z	2026-09-09 11:03:05.328	2026-09-09 11:19:41.547
cmttzpbx40049w8g5qhyewtly	RELANCE	cmtsgongf006ky4g5pn70rj2w	2026-08-26 11:42:24	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgongf006ky4g5pn70rj2w-RELANCE-2026-08-26T11:42:24.000Z	2026-09-09 11:03:05.368	2026-09-09 11:19:41.547
cmttzpby9004cw8g537hhghu0	RELANCE	cmtsgonqp006ny4g5rzwzii5w	2026-08-26 14:29:57	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgonqp006ny4g5rzwzii5w-RELANCE-2026-08-26T14:29:57.000Z	2026-09-09 11:03:05.409	2026-09-09 11:19:41.547
cmttzpbzf004fw8g5fubbgd2i	RELANCE	cmtsgoo96006wy4g59j3m9a3u	2026-08-27 08:36:39	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoo96006wy4g59j3m9a3u-RELANCE-2026-08-27T08:36:39.000Z	2026-09-09 11:03:05.451	2026-09-09 11:19:41.547
cmttzpc0j004iw8g5yq5hioty	RELANCE	cmtsgookg006zy4g526oxyyo4	2026-08-27 08:36:59	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgookg006zy4g526oxyyo4-RELANCE-2026-08-27T08:36:59.000Z	2026-09-09 11:03:05.491	2026-09-09 11:19:41.547
cmttzpc1l004lw8g5vyn2ltbr	RELANCE	cmtsgoow30072y4g54mwgg1wv	2026-08-27 08:37:19	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoow30072y4g54mwgg1wv-RELANCE-2026-08-27T08:37:19.000Z	2026-09-09 11:03:05.529	2026-09-09 11:19:41.547
cmttzpc2v004ow8g55huqcwa5	RELANCE	cmtsgo9xq0026y4g5n03aud9m	2026-08-14 11:12:36	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo9xq0026y4g5n03aud9m-RELANCE-2026-08-14T11:12:36.000Z	2026-09-09 11:03:05.575	2026-09-09 11:19:41.547
cmttzpc42004rw8g58pu9twt1	RELANCE	cmtsgops1007by4g5w90fho1y	2026-08-27 08:37:39	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgops1007by4g5w90fho1y-RELANCE-2026-08-27T08:37:39.000Z	2026-09-09 11:03:05.618	2026-09-09 11:19:41.547
cmttzpc58004uw8g5fkprdolc	RELANCE	cmtsgoq9f007ey4g5kt1ub1wm	2026-09-01 12:10:18	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoq9f007ey4g5kt1ub1wm-RELANCE-2026-09-01T12:10:18.000Z	2026-09-09 11:03:05.661	2026-09-09 11:19:41.547
cmttzpc6z004xw8g5teqk3eno	RELANCE	cmtsgoqkj007hy4g55xpgfcot	2026-09-01 12:10:18	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoqkj007hy4g55xpgfcot-RELANCE-2026-09-01T12:10:18.000Z	2026-09-09 11:03:05.723	2026-09-09 11:19:41.547
cmttzpc830050w8g5xlbdz51j	RELANCE	cmtsgoqu7007ly4g5nlxu6s8w	2026-09-01 13:16:09	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoqu7007ly4g5nlxu6s8w-RELANCE-2026-09-01T13:16:09.000Z	2026-09-09 11:03:05.763	2026-09-09 11:19:41.547
cmttzpc960053w8g5tscd07t1	RELANCE	cmtsgorcs007sy4g5e4pwr6qo	2026-09-07 10:14:18	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgorcs007sy4g5e4pwr6qo-RELANCE-2026-09-07T10:14:18.000Z	2026-09-09 11:03:05.802	2026-09-09 11:19:41.547
cmttzpca80056w8g5kiyuncfv	RELANCE	cmtsgorp1007xy4g5w3b0mokg	2026-09-08 08:21:32	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgorp1007xy4g5w3b0mokg-RELANCE-2026-09-08T08:21:32.000Z	2026-09-09 11:03:05.84	2026-09-09 11:19:41.547
cmttzpcbi0059w8g5uif89013	RELANCE	cmtsgoc2p002ry4g54pc4cjw3	2026-08-14 11:49:15	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgoc2p002ry4g54pc4cjw3-RELANCE-2026-08-14T11:49:15.000Z	2026-09-09 11:03:05.886	2026-09-09 11:19:41.547
cmttzpccp005cw8g5o3lf9u3r	RELANCE	cmtsgo6js000py4g5a2i13st2	2026-08-12 09:45:35	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo6js000py4g5a2i13st2-RELANCE-2026-08-12T09:45:35.000Z	2026-09-09 11:03:05.929	2026-09-09 11:19:41.547
cmttzpcdq005fw8g57j1n6am7	RELANCE	cmtsgo76s000vy4g5ngcmixeb	2026-08-12 09:46:35	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgo76s000vy4g5ngcmixeb-RELANCE-2026-08-12T09:46:35.000Z	2026-09-09 11:03:05.966	2026-09-09 11:19:41.547
cmttzpcew005iw8g5vjxr8ebj	RELANCE	cmtsgogo7004gy4g5widtu34d	2026-08-20 09:51:06	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgogo7004gy4g5widtu34d-RELANCE-2026-08-20T09:51:06.000Z	2026-09-09 11:03:06.008	2026-09-09 11:19:41.547
cmttzpch3005ow8g5djm7fmi4	RELANCE	cmtrrehgl00017gg5c6lkpi6n	2026-09-08 08:21:52	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrehgl00017gg5c6lkpi6n-RELANCE-2026-09-08T08:21:52.000Z	2026-09-09 11:03:06.087	2026-09-09 11:19:41.547
cmttzpcm10060w8g5vqofyboh	RELANCE	cmtsgojih005ey4g5bcsh395t	2026-08-24 10:48:52	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgojih005ey4g5bcsh395t-RELANCE-2026-08-24T10:48:52.000Z	2026-09-09 11:03:06.265	2026-09-09 11:19:41.547
cmttzpco20066w8g53adecqa4	RELANCE	cmtsgomkf006by4g5kk5bp1xm	2026-08-26 11:41:52	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgomkf006by4g5kk5bp1xm-RELANCE-2026-08-26T11:41:52.000Z	2026-09-09 11:03:06.338	2026-09-09 11:19:41.547
cmttzpcq7006cw8g5j1snot1f	RELANCE	cmtsgor2c007py4g5jawyc6x9	2026-09-04 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgor2c007py4g5jawyc6x9-RELANCE-2026-09-04T08:00:00.000Z	2026-09-09 11:03:06.415	2026-09-09 11:19:41.547
cmttzpcg1005lw8g58unhrp87	RELANCE	cmtsgopho0078y4g516epj1n5	2026-08-27 08:37:39	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgopho0078y4g516epj1n5-RELANCE-2026-08-27T08:37:39.000Z	2026-09-09 11:03:06.049	2026-09-09 11:19:41.547
cmttzpci3005rw8g50tfnxnte	RELANCE	cmtrrekia00047gg58eak12v9	2026-09-08 08:21:52	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrekia00047gg58eak12v9-RELANCE-2026-09-08T08:21:52.000Z	2026-09-09 11:03:06.124	2026-09-09 11:19:41.547
cmttzpckn005xw8g5j0hygfcy	RELANCE	cmtrrfdn400137gg55rf4lfit	2026-09-09 08:00:00	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtrrfdn400137gg55rf4lfit-RELANCE-2026-09-09T08:00:00.000Z	2026-09-09 11:03:06.216	2026-09-09 11:19:41.547
cmttzpcn30063w8g56c2l5wc3	RELANCE	cmtsgojss005hy4g543n81men	2026-08-24 10:50:13	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgojss005hy4g543n81men-RELANCE-2026-08-24T10:50:13.000Z	2026-09-09 11:03:06.303	2026-09-09 11:19:41.547
cmttzpcp60069w8g5ycgsb0ug	RELANCE	cmtsgop7m0075y4g5vvrpq4n7	2026-08-27 08:37:19	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgop7m0075y4g5vvrpq4n7-RELANCE-2026-08-27T08:37:19.000Z	2026-09-09 11:03:06.378	2026-09-09 11:19:41.547
cmtu0aprz0000h0g53xo8cxjj	RELANCE	cmtsgoa8z0029y4g53l3ery6y	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoa8z0029y4g53l3ery6y-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.103	\N
cmtu0apsx0001h0g5hqnjbylo	RELANCE	cmtsgoav2002fy4g5otcyvmwt	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoav2002fy4g5otcyvmwt-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.137	\N
cmtu0aptc0002h0g5vrcsu5nz	RELANCE	cmtrb23td000w04g5nkqkl1r1	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrb23td000w04g5nkqkl1r1-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.152	\N
cmtu0apud0005h0g5m9prn3zw	RELANCE	cmtsgodwd003ry4g50ov00o56	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgodwd003ry4g50ov00o56-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.189	\N
cmtu0apuo0006h0g56d9n0458	RELANCE	cmtsgoewx0041y4g57zq8vadx	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoewx0041y4g57zq8vadx-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.2	\N
cmtu0apuy0007h0g5926puz9m	RELANCE	cmtsgofgo0047y4g5szcewaov	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgofgo0047y4g5szcewaov-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.21	\N
cmtu0apv90008h0g5vy6d3jsr	RELANCE	cmtsgoga6004dy4g5m91sslcc	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoga6004dy4g5m91sslcc-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.221	\N
cmtu0apwd000ah0g51wdjnqrp	RELANCE	cmtrrev41000h7gg5pz5mbfwy	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrev41000h7gg5pz5mbfwy-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.261	\N
cmtu0apwo000bh0g5dvnibp2y	RELANCE	cmtrb23zd001904g59cyl5atc	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrb23zd001904g59cyl5atc-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.272	\N
cmtu0apx7000dh0g59v4edx41	RELANCE	cmtrb23ua000z04g5180m4y5p	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrb23ua000z04g5180m4y5p-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.291	\N
cmtu0apxr000fh0g5bpghuizl	RELANCE	cmtrb23yh001704g5kjlzolmu	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrb23yh001704g5kjlzolmu-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.312	\N
cmtu0apyh000hh0g5g1qapq0s	ESCALADE	cmtrb23sb000t04g5d4up9gy7	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	\N	cmtrb23sb000t04g5d4up9gy7-ESCALADE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.337	\N
cmtu0apz2000jh0g5u7me1ky0	RELANCE	cmtsgocij0033y4g5nz5cvmya	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgocij0033y4g5nz5cvmya-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.358	\N
cmtu0apzd000kh0g591ubpw50	RELANCE	cmtsgod1p003fy4g5l8pb2dxb	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgod1p003fy4g5l8pb2dxb-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.369	\N
cmtu0aq01000mh0g5kfhk8cep	RELANCE	cmtsgoebk003vy4g5ym4m5h68	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoebk003vy4g5ym4m5h68-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.393	\N
cmtu0aq0a000nh0g5vksg8uww	RELANCE	cmtsgo7u60015y4g5ricbvq34	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo7u60015y4g5ricbvq34-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.403	\N
cmtu0aq0w000ph0g51r72upoz	RELANCE	cmtsgo8tq001jy4g5e65cesvz	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8tq001jy4g5e65cesvz-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.424	\N
cmtu0aq1h000rh0g5rpq4iwe3	RELANCE	cmtsgo9h8001zy4g5t5nhwimp	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo9h8001zy4g5t5nhwimp-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.445	\N
cmtu0aq21000th0g5g8gxbb39	RELANCE	cmtsgoime0055y4g5wo86qqpx	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoime0055y4g5wo86qqpx-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.465	\N
cmtu0aq2u000wh0g5g1fv2icy	RELANCE	cmtsgocsb003by4g54pv0m36r	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgocsb003by4g54pv0m36r-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.494	\N
cmtu0aq3c000yh0g5biyfzvwt	RELANCE	cmtsgo67d000ky4g5vu29ykrw	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo67d000ky4g5vu29ykrw-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.512	\N
cmtu0aq3x0010h0g5xq9ls0gc	RELANCE	cmtsgo9aj001vy4g5yoia1oxg	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo9aj001vy4g5yoia1oxg-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.533	\N
cmtu0aq4j0012h0g5xf3plc6v	RELANCE	cmtsgonxd006ry4g5o81xamd0	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgonxd006ry4g5o81xamd0-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.555	\N
cmtu0aq540014h0g5ha4lgttr	RELANCE	cmtsgob5v002iy4g5xd5u2h8a	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgob5v002iy4g5xd5u2h8a-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.576	\N
cmtu0aq5z0017h0g5v7jyid80	RELANCE	cmtsgof5x0044y4g5cpswnx1h	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgof5x0044y4g5cpswnx1h-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.607	\N
cmtu0aq6l0019h0g5jl5jkicz	RELANCE	cmtrremyx00077gg58sd1lvbc	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrremyx00077gg58sd1lvbc-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.629	\N
cmtu0aq78001bh0g5555tv1jz	RELANCE	cmtsgo4kh0004y4g5x8cb73ha	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo4kh0004y4g5x8cb73ha-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.652	\N
cmtu0aq7u001dh0g527tr4ym3	RELANCE	cmtsgo5sm000gy4g5gnj7agvp	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo5sm000gy4g5gnj7agvp-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.674	\N
cmtu0aq8i001fh0g5g04fbhkh	RELANCE	cmtsgoh17004jy4g57156xepl	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoh17004jy4g57156xepl-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.698	\N
cmtu0aq98001hh0g5k2k01btb	RELANCE	cmtsgoixy0058y4g5xrzh9w0f	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoixy0058y4g5xrzh9w0f-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.724	\N
cmtu0aqa9001kh0g5yh3ya778	RELANCE	cmtsgokvz005ty4g56ymkf1te	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgokvz005ty4g56ymkf1te-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.761	\N
cmtu0aqb1001mh0g5cu7y1jpc	RELANCE	cmtsgolzx0065y4g50uyrdnql	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgolzx0065y4g50uyrdnql-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.789	\N
cmtu0aqbt001oh0g5882higu6	RELANCE	cmtrb240h001d04g5aua0ffc7	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrb240h001d04g5aua0ffc7-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.817	\N
cmtu0aqcr001qh0g5u3cj39y5	RELANCE	cmtsgo4vh0007y4g5gd9j9x9j	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo4vh0007y4g5gd9j9x9j-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.851	\N
cmtu0aqdi001sh0g5tskiabwr	RELANCE	cmtsgo6v3000sy4g54o1w189t	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo6v3000sy4g54o1w189t-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.878	\N
cmtu0aqe9001uh0g5ch9218z2	RELANCE	cmtsgo8nk001fy4g5y2djv750	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8nk001fy4g5y2djv750-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.905	\N
cmtu0aqez001wh0g5gbf4iqrd	RELANCE	cmtsgoibf0051y4g5b69jmta2	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoibf0051y4g5b69jmta2-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.932	\N
cmtu0aqff001xh0g5wv1ltroy	RELANCE	cmtsgoj7i005by4g53nudad4y	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoj7i005by4g53nudad4y-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.947	\N
cmtu0aqgb001zh0g5aaxjica4	RELANCE	cmtsgol74005wy4g50b3axzfw	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgol74005wy4g50b3axzfw-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.979	\N
cmtu0aqh40021h0g5wiw2bzgn	RELANCE	cmtsgomab0068y4g53n6axff9	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgomab0068y4g53n6axff9-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.008	\N
cmtu0apts0003h0g5hfwmqs45	RELANCE	cmtrb23v9001104g5ixlv9erv	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrb23v9001104g5ixlv9erv-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.168	\N
cmtu0apu30004h0g5qhq18wkl	RELANCE	cmtsgobga002ly4g5rk9g0koh	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgobga002ly4g5rk9g0koh-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.179	\N
cmtu0apw20009h0g5t010gucs	RELANCE	cmtrrep3w000b7gg5x9obo8vt	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrep3w000b7gg5x9obo8vt-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.25	\N
cmtu0apwy000ch0g5oq171t1f	RELANCE	cmtsgo9nf0023y4g5ox3bvpeg	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo9nf0023y4g5ox3bvpeg-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.282	\N
cmtu0apxh000eh0g5u768zh6u	RELANCE	cmtrb23wh001304g5k77we3z4	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrb23wh001304g5k77we3z4-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.301	\N
cmtu0apy7000gh0g5bhf9gyjr	ESCALADE	cmtrb23hw000l04g57uj226l1	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	\N	cmtrb23hw000l04g57uj226l1-ESCALADE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.327	\N
cmtu0apyq000ih0g5777p0rps	RELANCE	cmtsgoc80002vy4g5sebz4w09	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoc80002vy4g5sebz4w09-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.346	\N
cmtu0apzn000lh0g5tum2fdv0	RELANCE	cmtsgodks003ny4g57hptcv1r	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgodks003ny4g57hptcv1r-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.379	\N
cmtu0aq0l000oh0g5ouu0det0	RELANCE	cmtsgo80n0019y4g50195ckf2	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo80n0019y4g50195ckf2-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.413	\N
cmtu0aq17000qh0g5md0rk35s	RELANCE	cmtsgo94n001ry4g5dew9pp80	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo94n001ry4g5dew9pp80-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.435	\N
cmtu0aq1r000sh0g5mascr810	RELANCE	cmtsgohs3004ty4g5meanvzxr	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgohs3004ty4g5meanvzxr-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.455	\N
cmtu0aq2b000uh0g5m10ei6n8	RELANCE	cmtsgocd9002zy4g5sadj4hh5	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgocd9002zy4g5sadj4hh5-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.475	\N
cmtu0aq2l000vh0g561cqvg5e	RELANCE	cmtsgocne0037y4g5jie9rcwi	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgocne0037y4g5jie9rcwi-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.485	\N
cmtu0aq33000xh0g5wmp93ra9	RELANCE	cmtsgod9y003jy4g5qkwtv9q8	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgod9y003jy4g5qkwtv9q8-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.503	\N
cmtu0aq3m000zh0g5810117yg	RELANCE	cmtsgo8yx001ny4g5r56lfciy	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8yx001ny4g5r56lfciy-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.522	\N
cmtu0aq4u0013h0g5epy1qtdk	RELANCE	cmtsgoakd002cy4g56ysi0yfp	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoakd002cy4g56ysi0yfp-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.566	\N
cmtu0aq5f0015h0g5mxkh3p18	RELANCE	cmtsgobrr002oy4g5nhzegcu1	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgobrr002oy4g5nhzegcu1-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.587	\N
cmtu0aq5p0016h0g5fbo82te3	RELANCE	cmtsgoen0003yy4g5wyanze9i	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoen0003yy4g5wyanze9i-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.597	\N
cmtu0aq6a0018h0g5b41h545e	RELANCE	cmtsgofu5004ay4g5hdd3rvxy	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgofu5004ay4g5hdd3rvxy-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.618	\N
cmtu0aq6v001ah0g5p7qpbkkh	RELANCE	cmtrrerri000e7gg5kcbczxkv	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrerri000e7gg5kcbczxkv-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.639	\N
cmtu0aq7j001ch0g54lzx0i0h	RELANCE	cmtsgo56k000ay4g5a8doxgqa	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo56k000ay4g5a8doxgqa-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.663	\N
cmtu0aq86001eh0g5s8ozlnnl	RELANCE	cmtsgo7hy000zy4g50gkk03su	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo7hy000zy4g50gkk03su-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.686	\N
cmtu0aq8w001gh0g5aj4k1agi	RELANCE	cmtsgohm5004py4g5tvc42ntd	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgohm5004py4g5tvc42ntd-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.712	\N
cmtu0aq9l001ih0g5y8wbp6rr	RELANCE	cmtsgok1z005ky4g5y1bwph9e	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgok1z005ky4g5y1bwph9e-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.737	\N
cmtu0aq9x001jh0g564cvt4am	RELANCE	cmtsgokbk005ny4g5fgf1dhz8	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgokbk005ny4g5fgf1dhz8-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.749	\N
cmtu0aqam001lh0g5jj05sctb	RELANCE	cmtsgolgs005zy4g5nchb02i5	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgolgs005zy4g5nchb02i5-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.774	\N
cmtu0aqbf001nh0g5kasqjrp9	RELANCE	cmtsgomul006ey4g5117dmr5k	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgomul006ey4g5117dmr5k-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.803	\N
cmtu0aqcd001ph0g521p911sw	RELANCE	cmtsgo43i0001y4g59imk5k28	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo43i0001y4g59imk5k28-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.837	\N
cmtu0aqd4001rh0g5llpb92p1	RELANCE	cmtsgo5i0000dy4g56et0z1vf	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo5i0000dy4g56et0z1vf-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.864	\N
cmtu0aqdv001th0g5zlo7gl7u	RELANCE	cmtsgo8ce001cy4g5wr4aw71m	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo8ce001cy4g5wr4aw71m-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.891	\N
cmtu0aqel001vh0g5lpc4aond	RELANCE	cmtsgohc9004my4g57fmr5v9q	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgohc9004my4g57fmr5v9q-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.917	\N
cmtu0aqfw001yh0g5b0r2kxcf	RELANCE	cmtsgoklf005qy4g57pfwoe4i	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoklf005qy4g57pfwoe4i-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.964	\N
cmtu0aqgq0020h0g5hmenv7zp	RELANCE	cmtsgolq50062y4g56iitl3w0	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgolq50062y4g56iitl3w0-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:43.994	\N
cmtu0aqhi0022h0g5cjc23x1a	RELANCE	cmtsgon5n006hy4g5jng7aybn	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgon5n006hy4g5jng7aybn-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.022	\N
cmtu0aqie0024h0g538f0j0ry	RELANCE	cmtsgonqp006ny4g5rzwzii5w	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgonqp006ny4g5rzwzii5w-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.054	\N
cmtu0aqj50026h0g57yjkygeu	RELANCE	cmtsgookg006zy4g526oxyyo4	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgookg006zy4g526oxyyo4-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.081	\N
cmtu0aqjz0028h0g5aw0e1jcg	RELANCE	cmtsgo9xq0026y4g5n03aud9m	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo9xq0026y4g5n03aud9m-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.111	\N
cmtu0aqi00023h0g5zqqox0c5	RELANCE	cmtsgongf006ky4g5pn70rj2w	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgongf006ky4g5pn70rj2w-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.04	\N
cmtu0aqis0025h0g5n9fxhjoj	RELANCE	cmtsgoo96006wy4g59j3m9a3u	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoo96006wy4g59j3m9a3u-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.068	\N
cmtu0aqjj0027h0g5pwyqg5wv	RELANCE	cmtsgoow30072y4g54mwgg1wv	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoow30072y4g54mwgg1wv-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.095	\N
cmtu0aqkg0029h0g57vyfvyxb	RELANCE	cmtsgops1007by4g5w90fho1y	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgops1007by4g5w90fho1y-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.128	\N
cmtu0aql6002bh0g54u7jgor7	RELANCE	cmtsgoqkj007hy4g55xpgfcot	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoqkj007hy4g55xpgfcot-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.154	\N
cmtu0aqlw002dh0g5r2m6v0ds	RELANCE	cmtsgorcs007sy4g5e4pwr6qo	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgorcs007sy4g5e4pwr6qo-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.18	\N
cmtu0aqmm002fh0g5wely2m36	RELANCE	cmtsgoc2p002ry4g54pc4cjw3	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoc2p002ry4g54pc4cjw3-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.206	\N
cmtu0aqnc002hh0g544y349fr	RELANCE	cmtsgo76s000vy4g5ngcmixeb	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo76s000vy4g5ngcmixeb-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.232	\N
cmtu0aqo2002jh0g5vtr3cg6o	RELANCE	cmtrrehgl00017gg5c6lkpi6n	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrehgl00017gg5c6lkpi6n-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.258	\N
cmtu0aqow002lh0g5xgv7v918	RELANCE	cmtsgomkf006by4g5kk5bp1xm	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgomkf006by4g5kk5bp1xm-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.288	\N
cmtu0aqpi002nh0g5e8hi76wy	RELANCE	cmtsgopho0078y4g516epj1n5	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgopho0078y4g516epj1n5-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.31	\N
cmtu0aqq6002ph0g5som0dd5d	RELANCE	cmtrrfdn400137gg55rf4lfit	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrfdn400137gg55rf4lfit-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.334	\N
cmtu0aqqu002rh0g59e2en30e	RELANCE	cmtsgop7m0075y4g5vvrpq4n7	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgop7m0075y4g5vvrpq4n7-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.358	\N
cmtu0aqks002ah0g52czedfna	RELANCE	cmtsgoq9f007ey4g5kt1ub1wm	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoq9f007ey4g5kt1ub1wm-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.14	\N
cmtu0aqlj002ch0g5d1yvtcsk	RELANCE	cmtsgoqu7007ly4g5nlxu6s8w	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgoqu7007ly4g5nlxu6s8w-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.167	\N
cmtu0aqma002eh0g5nzt31n52	RELANCE	cmtsgorp1007xy4g5w3b0mokg	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgorp1007xy4g5w3b0mokg-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.194	\N
cmtu0aqmz002gh0g5lxmzj8ql	RELANCE	cmtsgo6js000py4g5a2i13st2	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgo6js000py4g5a2i13st2-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.219	\N
cmtu0aqnp002ih0g5qvtd97wx	RELANCE	cmtsgogo7004gy4g5widtu34d	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgogo7004gy4g5widtu34d-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.245	\N
cmtu0aqoi002kh0g5e01z6ybk	RELANCE	cmtsgojih005ey4g5bcsh395t	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgojih005ey4g5bcsh395t-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.274	\N
cmtu0aqpu002oh0g5z3fqlqv1	RELANCE	cmtrrekia00047gg58eak12v9	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtrrekia00047gg58eak12v9-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.322	\N
cmtu0aqqh002qh0g5x2rol9hw	RELANCE	cmtsgojss005hy4g543n81men	2026-09-09 11:19:41.547	EN_ATTENTE	0	\N	\N	\N	{"ordre": 1}	cmtsgojss005hy4g543n81men-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.345	\N
cmtu0aqp8002mh0g530batukg	RELANCE	cmtsgor2c007py4g5jawyc6x9	2026-09-09 11:19:41.547	ANNULE	0	\N	\N	\N	{"ordre": 1}	cmtsgor2c007py4g5jawyc6x9-RELANCE-2026-09-09T11:19:41.547Z	2026-09-09 11:19:44.3	2026-09-10 11:19:35.305
\.


--
-- Data for Name: utilisateur; Type: TABLE DATA; Schema: public; Owner: mailflow
--

COPY public.utilisateur (id, email, nom_complet, initiales, avatar_url, fonction, role, actif, entra_object_id, suppleant_id, cree_le, modifie_le) FROM stdin;
cmtrb2372000604g5852ipk4u	mamadou.berthe@exemple-mining.ml	Mamadou Berthé	MB	\N	Responsable administratif	ADMINISTRATEUR	t	\N	\N	2026-09-07 13:57:37.838	2026-09-07 13:57:37.838
cmtrb238n000704g585q1vjii	fatoumata.diallo@exemple-mining.ml	Fatoumata Diallo	FD	\N	Approvisionnements	GESTIONNAIRE	t	\N	cmtrb2372000604g5852ipk4u	2026-09-07 13:57:37.895	2026-09-07 13:57:37.895
cmtrb238z000804g5igkoyh1j	bintou.keita@exemple-mining.ml	Bintou Keïta	BK	\N	Comptabilité et fiscalité	GESTIONNAIRE	t	\N	cmtrb2372000604g5852ipk4u	2026-09-07 13:57:37.908	2026-09-07 13:57:37.908
cmtrb239k000904g5zjr5hvz1	seydou.coulibaly@exemple-mining.ml	Seydou Coulibaly	SC	\N	Exploitation	RESPONSABLE	t	\N	\N	2026-09-07 13:57:37.929	2026-09-07 13:57:37.929
cmtsgvw9s0000xog526xbjtuh	dec@samko.group	Destinataire d'essai	DE	\N	\N	GESTIONNAIRE	t	\N	\N	2026-09-08 09:28:32.8	2026-09-08 09:59:22.686
cmtvz3c7h00003sg5lwfedj6t	info@aamining.net	Accueil AA Mining	AA	\N	Boîte générique	GESTIONNAIRE	t	\N	\N	2026-09-10 20:21:31.662	2026-09-10 20:21:31.662
cmtvz3c8f00013sg5r8lixyad	baremabocoum@aamining.net	Baréma Bocoum	BB	\N	\N	GESTIONNAIRE	t	\N	\N	2026-09-10 20:21:31.696	2026-09-10 20:21:31.696
cmtvz3c8p00023sg5h3dfki77	mariamtraore@aamining.net	Mariam Traoré	MT	\N	\N	GESTIONNAIRE	t	\N	\N	2026-09-10 20:21:31.705	2026-09-10 20:21:31.705
\.


--
-- Name: echange_numero_seq; Type: SEQUENCE SET; Schema: public; Owner: mailflow
--

SELECT pg_catalog.setval('public.echange_numero_seq', 235, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: absence absence_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.absence
    ADD CONSTRAINT absence_pkey PRIMARY KEY (id);


--
-- Name: boite_suivie boite_suivie_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.boite_suivie
    ADD CONSTRAINT boite_suivie_pkey PRIMARY KEY (id);


--
-- Name: categorie categorie_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.categorie
    ADD CONSTRAINT categorie_pkey PRIMARY KEY (id);


--
-- Name: correspondant correspondant_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.correspondant
    ADD CONSTRAINT correspondant_pkey PRIMARY KEY (id);


--
-- Name: echange echange_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.echange
    ADD CONSTRAINT echange_pkey PRIMARY KEY (id);


--
-- Name: evenement evenement_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.evenement
    ADD CONSTRAINT evenement_pkey PRIMARY KEY (id);


--
-- Name: expediteur_exclu expediteur_exclu_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.expediteur_exclu
    ADD CONSTRAINT expediteur_exclu_pkey PRIMARY KEY (id);


--
-- Name: jour_ferie jour_ferie_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.jour_ferie
    ADD CONSTRAINT jour_ferie_pkey PRIMARY KEY (id);


--
-- Name: message message_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_pkey PRIMARY KEY (id);


--
-- Name: modele_message modele_message_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.modele_message
    ADD CONSTRAINT modele_message_pkey PRIMARY KEY (id);


--
-- Name: parametre parametre_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.parametre
    ADD CONSTRAINT parametre_pkey PRIMARY KEY (cle);


--
-- Name: piece_jointe piece_jointe_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.piece_jointe
    ADD CONSTRAINT piece_jointe_pkey PRIMARY KEY (id);


--
-- Name: regle_relance regle_relance_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.regle_relance
    ADD CONSTRAINT regle_relance_pkey PRIMARY KEY (id);


--
-- Name: relance relance_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.relance
    ADD CONSTRAINT relance_pkey PRIMARY KEY (id);


--
-- Name: travail_planifie travail_planifie_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.travail_planifie
    ADD CONSTRAINT travail_planifie_pkey PRIMARY KEY (id);


--
-- Name: utilisateur utilisateur_pkey; Type: CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_pkey PRIMARY KEY (id);


--
-- Name: absence_utilisateur_id_debut_fin_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX absence_utilisateur_id_debut_fin_idx ON public.absence USING btree (utilisateur_id, debut, fin);


--
-- Name: boite_suivie_adresse_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX boite_suivie_adresse_key ON public.boite_suivie USING btree (adresse);


--
-- Name: categorie_code_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX categorie_code_key ON public.categorie USING btree (code);


--
-- Name: correspondant_email_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX correspondant_email_key ON public.correspondant USING btree (email);


--
-- Name: correspondant_email_trgm_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX correspondant_email_trgm_idx ON public.correspondant USING gin (lower(email) public.gin_trgm_ops);


--
-- Name: correspondant_organisation_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX correspondant_organisation_idx ON public.correspondant USING btree (organisation);


--
-- Name: correspondant_organisation_trgm_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX correspondant_organisation_trgm_idx ON public.correspondant USING gin (lower(COALESCE(organisation, ''::text)) public.gin_trgm_ops);


--
-- Name: echange_a_qualifier_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_a_qualifier_idx ON public.echange USING btree (recu_le DESC) WHERE (statut = 'A_QUALIFIER'::public."StatutEchange");


--
-- Name: echange_actif_echeance_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_actif_echeance_idx ON public.echange USING btree (echeance) WHERE (statut = ANY (ARRAY['A_QUALIFIER'::public."StatutEchange", 'EN_ATTENTE'::public."StatutEchange", 'RELANCE'::public."StatutEchange", 'ESCALADE'::public."StatutEchange"]));


--
-- Name: echange_actif_responsable_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_actif_responsable_idx ON public.echange USING btree (responsable_id, echeance) WHERE (statut = ANY (ARRAY['EN_ATTENTE'::public."StatutEchange", 'RELANCE'::public."StatutEchange", 'ESCALADE'::public."StatutEchange"]));


--
-- Name: echange_boite_id_conversation_id_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX echange_boite_id_conversation_id_key ON public.echange USING btree (boite_id, conversation_id);


--
-- Name: echange_correspondant_id_recu_le_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_correspondant_id_recu_le_idx ON public.echange USING btree (correspondant_id, recu_le);


--
-- Name: echange_numero_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX echange_numero_key ON public.echange USING btree (numero);


--
-- Name: echange_prochaine_relance_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_prochaine_relance_idx ON public.echange USING btree (prochaine_relance_le) WHERE ((prochaine_relance_le IS NOT NULL) AND (statut = ANY (ARRAY['EN_ATTENTE'::public."StatutEchange", 'RELANCE'::public."StatutEchange"])));


--
-- Name: echange_prochaine_relance_le_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_prochaine_relance_le_idx ON public.echange USING btree (prochaine_relance_le);


--
-- Name: echange_recu_le_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_recu_le_idx ON public.echange USING btree (recu_le);


--
-- Name: echange_responsable_id_statut_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_responsable_id_statut_idx ON public.echange USING btree (responsable_id, statut);


--
-- Name: echange_sans_responsable_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_sans_responsable_idx ON public.echange USING btree (recu_le) WHERE ((responsable_id IS NULL) AND (statut = ANY (ARRAY['A_QUALIFIER'::public."StatutEchange", 'EN_ATTENTE'::public."StatutEchange"])));


--
-- Name: echange_statut_echeance_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX echange_statut_echeance_idx ON public.echange USING btree (statut, echeance);


--
-- Name: evenement_cree_le_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX evenement_cree_le_idx ON public.evenement USING btree (cree_le);


--
-- Name: evenement_echange_id_cree_le_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX evenement_echange_id_cree_le_idx ON public.evenement USING btree (echange_id, cree_le);


--
-- Name: evenement_type_cree_le_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX evenement_type_cree_le_idx ON public.evenement USING btree (type, cree_le);


--
-- Name: expediteur_exclu_type_valeur_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX expediteur_exclu_type_valeur_key ON public.expediteur_exclu USING btree (type, valeur);


--
-- Name: jour_ferie_date_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX jour_ferie_date_key ON public.jour_ferie USING btree (date);


--
-- Name: message_boite_id_date_message_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX message_boite_id_date_message_idx ON public.message USING btree (boite_id, date_message);


--
-- Name: message_echange_id_date_message_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX message_echange_id_date_message_idx ON public.message USING btree (echange_id, date_message);


--
-- Name: message_internet_message_id_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX message_internet_message_id_key ON public.message USING btree (internet_message_id);


--
-- Name: modele_message_code_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX modele_message_code_key ON public.modele_message USING btree (code);


--
-- Name: piece_jointe_message_id_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX piece_jointe_message_id_idx ON public.piece_jointe USING btree (message_id);


--
-- Name: regle_relance_categorie_id_ordre_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX regle_relance_categorie_id_ordre_key ON public.regle_relance USING btree (categorie_id, ordre);


--
-- Name: relance_cle_idempotence_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX relance_cle_idempotence_key ON public.relance USING btree (cle_idempotence);


--
-- Name: relance_echange_id_ordre_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX relance_echange_id_ordre_key ON public.relance USING btree (echange_id, ordre);


--
-- Name: relance_echange_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX relance_echange_idx ON public.relance USING btree (echange_id, ordre) WHERE (statut = 'ENVOYEE'::public."StatutRelance");


--
-- Name: relance_envoyee_le_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX relance_envoyee_le_idx ON public.relance USING btree (envoyee_le);


--
-- Name: travail_a_executer_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX travail_a_executer_idx ON public.travail_planifie USING btree (executer_a) WHERE (statut = 'EN_ATTENTE'::public."StatutTravail");


--
-- Name: travail_planifie_cle_idempotence_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX travail_planifie_cle_idempotence_key ON public.travail_planifie USING btree (cle_idempotence);


--
-- Name: travail_planifie_echange_id_type_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX travail_planifie_echange_id_type_idx ON public.travail_planifie USING btree (echange_id, type);


--
-- Name: travail_planifie_statut_executer_a_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX travail_planifie_statut_executer_a_idx ON public.travail_planifie USING btree (statut, executer_a);


--
-- Name: travail_verrou_perime_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX travail_verrou_perime_idx ON public.travail_planifie USING btree (verrou_a) WHERE (statut = 'EN_COURS'::public."StatutTravail");


--
-- Name: utilisateur_actif_nom_complet_idx; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE INDEX utilisateur_actif_nom_complet_idx ON public.utilisateur USING btree (actif, nom_complet);


--
-- Name: utilisateur_email_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX utilisateur_email_key ON public.utilisateur USING btree (email);


--
-- Name: utilisateur_entra_object_id_key; Type: INDEX; Schema: public; Owner: mailflow
--

CREATE UNIQUE INDEX utilisateur_entra_object_id_key ON public.utilisateur USING btree (entra_object_id);


--
-- Name: absence absence_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.absence
    ADD CONSTRAINT absence_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: categorie categorie_escalade_vers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.categorie
    ADD CONSTRAINT categorie_escalade_vers_id_fkey FOREIGN KEY (escalade_vers_id) REFERENCES public.utilisateur(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: echange echange_boite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.echange
    ADD CONSTRAINT echange_boite_id_fkey FOREIGN KEY (boite_id) REFERENCES public.boite_suivie(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: echange echange_categorie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.echange
    ADD CONSTRAINT echange_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES public.categorie(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: echange echange_correspondant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.echange
    ADD CONSTRAINT echange_correspondant_id_fkey FOREIGN KEY (correspondant_id) REFERENCES public.correspondant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: echange echange_reponse_par_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.echange
    ADD CONSTRAINT echange_reponse_par_id_fkey FOREIGN KEY (reponse_par_id) REFERENCES public.utilisateur(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: echange echange_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.echange
    ADD CONSTRAINT echange_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.utilisateur(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: evenement evenement_echange_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.evenement
    ADD CONSTRAINT evenement_echange_id_fkey FOREIGN KEY (echange_id) REFERENCES public.echange(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: evenement evenement_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.evenement
    ADD CONSTRAINT evenement_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: message message_boite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_boite_id_fkey FOREIGN KEY (boite_id) REFERENCES public.boite_suivie(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: message message_echange_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_echange_id_fkey FOREIGN KEY (echange_id) REFERENCES public.echange(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: piece_jointe piece_jointe_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.piece_jointe
    ADD CONSTRAINT piece_jointe_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.message(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: regle_relance regle_relance_categorie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.regle_relance
    ADD CONSTRAINT regle_relance_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES public.categorie(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: regle_relance regle_relance_modele_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.regle_relance
    ADD CONSTRAINT regle_relance_modele_id_fkey FOREIGN KEY (modele_id) REFERENCES public.modele_message(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: relance relance_destinataire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.relance
    ADD CONSTRAINT relance_destinataire_id_fkey FOREIGN KEY (destinataire_id) REFERENCES public.utilisateur(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: relance relance_echange_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.relance
    ADD CONSTRAINT relance_echange_id_fkey FOREIGN KEY (echange_id) REFERENCES public.echange(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: relance relance_modele_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.relance
    ADD CONSTRAINT relance_modele_id_fkey FOREIGN KEY (modele_id) REFERENCES public.modele_message(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: travail_planifie travail_planifie_echange_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.travail_planifie
    ADD CONSTRAINT travail_planifie_echange_id_fkey FOREIGN KEY (echange_id) REFERENCES public.echange(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: utilisateur utilisateur_suppleant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mailflow
--

ALTER TABLE ONLY public.utilisateur
    ADD CONSTRAINT utilisateur_suppleant_id_fkey FOREIGN KEY (suppleant_id) REFERENCES public.utilisateur(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Ce8OWJaG0o60C17lAkCe7KHaRVprRHIaJdADG3tcW6F2ysPaFeapmSmyVtGM3ke

