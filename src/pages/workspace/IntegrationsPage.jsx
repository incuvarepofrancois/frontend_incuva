import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Plug, Settings2, ShieldCheck, X } from 'lucide-react';
import { getIntegrations, getBambooHRSyncStatus, getFrappeHRSyncStatus, saveIntegrationCredentials, startBambooHRSync, startFrappeHRSync, testBambooHRConnection, testFrappeHRConnection } from '../../services/api';
import { WorkspaceHeader } from './WorkspaceShared';

const integrations = [
  { key: 'teams', name: 'Microsoft Teams', group: 'Réunions & collaboration', description: 'Reliez Microsoft Graph pour exploiter les réunions et les événements de votre organisation.', setupNote: 'Mode application (client credentials). Les permissions Graph de type Application doivent être accordées par un administrateur Microsoft Entra avant toute utilisation.', state: 'Configuration requise', mark: 'T', protocol: 'Microsoft Graph', fields: [{ name: 'tenant_id', label: 'ID de l’annuaire (Tenant ID)', autoComplete: 'off' }, { name: 'client_id', label: 'ID de l’application (Client ID)', autoComplete: 'off' }, { name: 'client_secret', label: 'Valeur du secret client', hint: 'Collez la valeur du secret, pas son ID. Microsoft ne l’affiche qu’à sa création.', secret: true, autoComplete: 'new-password' }] },
  { key: 'zoom', name: 'Zoom', group: 'Réunions & collaboration', description: 'Configurez les identifiants de votre application Zoom Server-to-Server OAuth.', setupNote: 'Ces trois valeurs viennent d’une application Server-to-Server OAuth dans Zoom App Marketplace. Les permissions API se règlent dans cette application.', state: 'Configuration requise', mark: 'Z', protocol: 'Server-to-Server OAuth', fields: [{ name: 'account_id', label: 'Account ID', autoComplete: 'off' }, { name: 'client_id', label: 'Client ID', autoComplete: 'off' }, { name: 'client_secret', label: 'Client Secret', secret: true, autoComplete: 'new-password' }] },
  { key: 'jira', name: 'Jira', group: 'Outils de travail', description: 'Renseignez l’URL de votre site Jira Cloud et un jeton API dédié.', setupNote: 'Cette configuration correspond à Jira Cloud et au connecteur actuel : e-mail Atlassian + API token en Basic Auth. Pour une intégration distribuée, Atlassian recommande OAuth 2.0 (3LO).', state: 'Connecteur disponible', mark: 'J', protocol: 'Jira Cloud · API token', fields: [{ name: 'base_url', label: 'URL du site Jira Cloud', placeholder: 'https://entreprise.atlassian.net', type: 'url', hint: 'Adresse de votre site, sans chemin /rest/api.' }, { name: 'email', label: 'E-mail du compte Atlassian', type: 'email', autoComplete: 'username' }, { name: 'api_token', label: 'API token Atlassian', hint: 'Créez un jeton dédié avec les droits minimaux nécessaires.', secret: true, autoComplete: 'new-password' }] },
  { key: 'github', name: 'GitHub', group: 'Outils de travail', description: 'Reliez une organisation GitHub pour lire les données autorisées par le jeton.', setupNote: 'Le connecteur actuel utilise un jeton personnel. Choisissez un fine-grained personal access token limité à cette organisation et aux dépôts nécessaires. Pour une intégration organisationnelle distribuée, une GitHub App est préférable; elle demandera un flux d’installation dédié.', state: 'Connecteur disponible', mark: 'G', protocol: 'GitHub API · fine-grained token', fields: [{ name: 'organization', label: 'Slug de l’organisation', placeholder: 'mon-organisation', autoComplete: 'organization' }, { name: 'personal_access_token', label: 'Fine-grained personal access token', secret: true, autoComplete: 'new-password' }] },
  { key: 'bamboohr', name: 'BambooHR', group: 'SIRH', description: 'Connectez votre compte BambooHR à l’aide de son domaine et d’une clé API.', setupNote: 'La clé API agit avec les permissions de l’utilisateur qui l’a créée. Utilisez un compte dédié avec les accès minimums nécessaires.', state: 'Connecteur disponible', mark: 'B', protocol: 'BambooHR API · API key', fields: [{ name: 'subdomain', label: 'Domaine de l’entreprise', placeholder: 'mon-entreprise', hint: 'Saisissez uniquement la partie avant .bamboohr.com.', autoComplete: 'off' }, { name: 'api_key', label: 'Clé API BambooHR', secret: true, autoComplete: 'new-password' }] },
  { key: 'frappehr', name: 'Frappe HR', group: 'SIRH', description: 'Connectez votre instance Frappe HR auto-hébergée pour importer les collaborateurs.', setupNote: 'Dans Frappe HR, ouvrez un utilisateur technique puis Paramètres > API Access > Generate Keys. INCUVA utilise les droits de cet utilisateur : accordez uniquement la lecture des collaborateurs et des demandes de congé. HTTPS est requis hors localhost.', state: 'Connecteur disponible', mark: 'F', protocol: 'Frappe REST API · API key + secret', fields: [{ name: 'base_url', label: 'URL de votre instance', placeholder: 'https://rh.entreprise.fr', type: 'url', hint: 'Saisissez uniquement l’origine, par exemple http://localhost:8000 pour une instance locale.', autoComplete: 'url' }, { name: 'api_key', label: 'API Key', autoComplete: 'off' }, { name: 'api_secret', label: 'API Secret', secret: true, autoComplete: 'new-password' }] },  { key: 'lucca', name: 'Lucca', group: 'SIRH', description: 'Reliez Lucca pour centraliser les données collaborateurs de votre organisation.', setupNote: 'La configuration ci-dessous utilise la clé API de l’API Lucca v3/v4 héritée. Saisissez le domaine de votre tenant et une clé avec les droits de lecture minimaux. Lucca propose aussi une API OAuth plus récente.', state: 'Clé API requise', mark: 'L', protocol: 'API Lucca · API key', fields: [{ name: 'base_url', label: 'URL de votre tenant Lucca', placeholder: 'https://mon-entreprise.ilucca.net', type: 'url', autoComplete: 'url' }, { name: 'api_key', label: 'Clé API Lucca', secret: true, autoComplete: 'new-password' }] },
  { key: 'factorial', name: 'Factorial', group: 'SIRH', description: 'Préparez la connexion à l’API RH de Factorial.', setupNote: 'La clé API Factorial est réservée aux outils internes, donne un accès très large et ne permet pas de limiter les scopes. Pour connecter plusieurs entreprises à INCUVA, Factorial exige une intégration partenaire OAuth ; ce formulaire stocke une clé pour un test interne uniquement.', state: 'API key interne', mark: 'F', protocol: 'Factorial API · x-api-key', fields: [{ name: 'api_key', label: 'Clé API Factorial (usage interne)', secret: true, autoComplete: 'new-password' }] },
  { key: 'payfit', name: 'PayFit', group: 'SIRH', description: 'Préparez l’accès aux données RH de votre compte PayFit.', setupNote: 'Un administrateur PayFit peut créer une clé dans Intégrations > API et choisir ses scopes. L’API clé client est réservée aux plans Standard ou Premium ; PayFit indique actuellement suspendre temporairement les nouvelles demandes d’intégration partenaire.', state: 'Clé API requise', mark: 'P', protocol: 'PayFit API · Bearer API key', fields: [{ name: 'api_key', label: 'Clé API PayFit', secret: true, autoComplete: 'new-password' }] },
  { key: 'malibou', name: 'Malibou', group: 'SIRH', description: 'Ajoutez Malibou à votre écosystème RH et paie.', setupNote: 'Je n’ai pas trouvé de documentation publique pour une API d’intégration directe Malibou. La connexion directe devra être confirmée avec leur équipe ; Malibou présente notamment une intégration avec Silae.', state: 'Accès partenaire à confirmer', mark: 'M', protocol: 'Connexion directe à confirmer', fields: [] },
  { key: 'eurecia', name: 'Eurécia', group: 'SIRH', description: 'Préparez la connexion en lecture aux données collaborateurs Eurécia.', setupNote: 'L’API Web Services doit être activée sur votre compte. Générez un token associé à un utilisateur ou à un profil disposant uniquement des droits de lecture utiles. Eurécia peut demander une activation via le support.', state: 'Token API requis', mark: 'E', protocol: 'Eurécia Web Services · token', fields: [{ name: 'api_token', label: 'Token API Eurécia', secret: true, autoComplete: 'new-password' }] },
  { key: 'skello', name: 'Skello', group: 'SIRH', description: 'Ajoutez Skello, la plateforme RH et de planification des équipes terrain.', setupNote: 'L’accès à l’API publique documentée nécessite une Access Key obtenue auprès de votre Customer Success Manager. Les endpoints publics consultés couvrent surtout les organisations et établissements ; la lecture du registre salarié doit être confirmée pour votre compte.', state: 'Clé partenaire requise', mark: 'S', protocol: 'Skello API · Access Key', fields: [{ name: 'access_key', label: 'Access Key Skello', secret: true, autoComplete: 'new-password' }, { name: 'organization_id', label: 'ID de l’organisation Skello', autoComplete: 'off' }] },
  { key: 'silae', name: 'Silae', group: 'Finance & facturation', description: 'Ajoutez Silae pour préparer les échanges entre RH et paie.', setupNote: 'L’API Silae repose sur OAuth 2.0 et nécessite Client ID, Client Secret et Subscription Key. L’accès et l’environnement de test sont réservés aux partenaires ou clients autorisés ; le flux OAuth complet doit être activé avant les tests de connexion.', state: 'Accès partenaire requis', mark: 'S', protocol: 'API Silae · OAuth 2.0', fields: [{ name: 'client_id', label: 'Client ID', autoComplete: 'off' }, { name: 'client_secret', label: 'Client Secret', secret: true, autoComplete: 'new-password' }, { name: 'subscription_key', label: 'Subscription Key', secret: true, autoComplete: 'new-password' }] },  { key: 'personio', name: 'Personio', group: 'SIRH', description: 'Configurez les identifiants API de votre environnement Personio.', setupNote: 'Créez les identifiants dans Marketplace > Connected integrations. Les accès et attributs lisibles se configurent dans Personio; aucun Company ID n’est requis pour le flux API actuel.', state: 'Connecteur disponible', mark: 'P', protocol: 'Personio API · client credentials', fields: [{ name: 'client_id', label: 'Client ID', autoComplete: 'off' }, { name: 'client_secret', label: 'Client Secret', secret: true, autoComplete: 'new-password' }] },
  { key: 'slack', name: 'Slack', group: 'Notifications', description: 'Ajoutez l’URL du webhook entrant du canal destiné aux notifications INCUVA.', setupNote: 'L’URL est un secret qui donne le droit de publier dans le canal choisi. Créez un Incoming Webhook pour l’application Slack et le canal souhaité.', state: 'Configuration requise', mark: 'S', protocol: 'Slack Incoming Webhook', fields: [{ name: 'webhook_url', label: 'URL du webhook entrant', type: 'url', placeholder: 'https://hooks.slack.com/services/…', secret: true, autoComplete: 'new-password' }] },
  { key: 'notion', name: 'Notion', group: 'Projets & documentation', description: 'Donnez accès aux espaces de documentation et bases Notion utiles à vos équipes.', setupNote: 'Créez une intégration interne Notion avec les capacités minimales nécessaires, puis partagez explicitement avec elle chaque page ou base à consulter.', state: 'Configuration à renseigner', mark: 'N', protocol: 'Notion API · internal integration', fields: [{ name: 'integration_token', label: 'Internal Integration Secret', secret: true, autoComplete: 'new-password' }] },
  { key: 'hubspot', name: 'HubSpot', group: 'CRM & ventes', description: 'Préparez l’accès aux données CRM de votre compte HubSpot.', setupNote: 'Pour un compte HubSpot unique, créez une Private App et sélectionnez uniquement les scopes en lecture requis. Une intégration SaaS distribuée devra évoluer vers OAuth.', state: 'Configuration à renseigner', mark: 'H', protocol: 'HubSpot · Private App', fields: [{ name: 'private_app_token', label: 'Private App access token', secret: true, autoComplete: 'new-password' }] },
  { key: 'asana', name: 'Asana', group: 'Projets & documentation', description: 'Préparez l’accès aux projets et tâches Asana de votre équipe.', setupNote: 'Le Personal Access Token hérite des droits de son utilisateur. Utilisez un compte technique aux droits limités; Asana recommande OAuth pour une application utilisée par plusieurs clients.', state: 'Configuration à renseigner', mark: 'A', protocol: 'Asana API · Personal Access Token', fields: [{ name: 'personal_access_token', label: 'Personal Access Token', secret: true, autoComplete: 'new-password' }] },
  { key: 'stripe', name: 'Stripe', group: 'Finance & facturation', description: 'Préparez l’accès aux données financières et de facturation de votre compte Stripe.', setupNote: 'Créez une Restricted API Key en lecture seule avec uniquement les permissions nécessaires. Utilisez d’abord une clé de test; le secret de webhook Stripe est distinct et n’est pas requis pour l’accès API.', state: 'Configuration à renseigner', mark: 'S', protocol: 'Stripe API · Restricted Key', fields: [{ name: 'restricted_api_key', label: 'Restricted API Key', secret: true, autoComplete: 'new-password' }] },
  { key: 'pennylane', name: 'Pennylane', group: 'Finance & facturation', description: 'Préparez l’accès aux données comptables et de facturation de votre entreprise.', setupNote: 'Générez un Company API Token dans Paramètres > Connectivité > Développeurs. La création exige un compte Essential ou supérieur et un rôle administrateur; choisissez des permissions en lecture seule.', state: 'Configuration à renseigner', mark: 'P', protocol: 'Pennylane API · Company token', fields: [{ name: 'company_api_token', label: 'Company API Token', secret: true, autoComplete: 'new-password' }] },
];
const groups = ['Réunions & collaboration', 'SIRH', 'Outils de travail', 'Projets & documentation', 'CRM & ventes', 'Finance & facturation', 'Notifications'];
const emptyCredentials = (item) => Object.fromEntries(item.fields.map((field) => [field.name, '']));
const hasEmployeeSync = (key) => ['bamboohr', 'frappehr'].includes(key);

function CredentialsModal({ integration, onClose, onSaved, onConnectionUpdated, initiallyConfigured = false }) {
  const [credentials, setCredentials] = useState(() => emptyCredentials(integration));
  const [visible, setVisible] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [configured, setConfigured] = useState(initiallyConfigured);
  const [connectionState, setConnectionState] = useState(['connected', 'failed'].includes(integration.connectionStatus) ? {
    ok: integration.connectionStatus === 'connected',
    message: integration.connectionError || (integration.connectionStatus === 'connected' ? 'Connexion vérifiée.' : ''),
  } : null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [sync, setSync] = useState(null);
  const [startingSync, setStartingSync] = useState(false);
  const firstField = useRef(null);
  const previousFocus = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    firstField.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape' && !savingRef.current) onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus.current?.focus?.(); };
  }, [onClose]);

  useEffect(() => {
    if (!hasEmployeeSync(integration.key) || !configured) return undefined;
    let active = true;
    const refreshStatus = integration.key === 'frappehr' ? getFrappeHRSyncStatus : getBambooHRSyncStatus;
    const refresh = () => refreshStatus().then((result) => { if (active) setSync(result.sync); }).catch(() => {});
    refresh();
    if (!sync || !['queued', 'running'].includes(sync.status)) return () => { active = false; };
    const timer = window.setInterval(refresh, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [integration.key, configured, sync?.status]);

  async function submit(event) {
    event.preventDefault();
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(credentials).filter(([, value]) => value.trim() !== ''));
      await saveIntegrationCredentials(integration.key, payload);
      setCredentials(emptyCredentials(integration));
      setSaved(true);
      setConfigured(true);
      setConnectionState(null);
      onSaved(integration.key);
    } catch (requestError) {
      setError(requestError.message || 'Impossible d’enregistrer les identifiants.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function verifyBambooHRConnection() {
    setCheckingConnection(true);
    setConnectionState(null);
    try {
      const testConnection = integration.key === 'frappehr' ? testFrappeHRConnection : testBambooHRConnection;
      const result = await testConnection();
      setConnectionState({ ok: true, message: result.message });
      onConnectionUpdated(integration.key, { connection_status: 'connected', connection_checked_at: new Date().toISOString(), connection_error: null });
    } catch (requestError) {
      const message = requestError.message || 'La connexion n’a pas pu être vérifiée.';
      setConnectionState({ ok: false, message });
      onConnectionUpdated(integration.key, { connection_status: 'failed', connection_checked_at: new Date().toISOString(), connection_error: message });
    } finally {
      setCheckingConnection(false);
    }
  }

  async function runBambooHRSync() {
    setStartingSync(true);
    try {
      const startSync = integration.key === 'frappehr' ? startFrappeHRSync : startBambooHRSync;
      const result = await startSync();
      setSync(result.sync);
    } catch (requestError) {
      setSync((current) => ({ ...current, status: 'failed', last_error: requestError.message || 'La synchronisation n’a pas pu démarrer.' }));
    } finally {
      setStartingSync(false);
    }
  }

  return (
    <div className="integration-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="integration-modal" role="dialog" aria-modal="true" aria-labelledby="integration-modal-title" aria-describedby="integration-modal-description">
        <header className="integration-modal-header">
          <div className="integration-modal-heading"><span className={`workspace-integration-mark mark-${integration.mark.toLowerCase()} mark-integration-${integration.key}`} aria-hidden="true">{integration.mark}</span><div><span className="module-section-kicker">CONFIGURATION DU CONNECTEUR</span><h2 id="integration-modal-title">Connecter {integration.name}</h2></div></div>
          <button className="integration-modal-close" type="button" onClick={onClose} aria-label="Fermer la fenêtre" disabled={saving}><X size={19} /></button>
        </header>
        <p id="integration-modal-description" className="integration-modal-description">Renseignez les accès de votre organisation. Ils seront chiffrés avant leur enregistrement et ne seront jamais réaffichés ici.</p>
        <aside className="integration-setup-note"><ShieldCheck size={15} aria-hidden="true" /><span>{integration.setupNote}</span></aside>
        {saved ? <div className="integration-modal-success" role="status"><CheckCircle2 size={17} /> Identifiants enregistrés.</div> : null}
        {hasEmployeeSync(integration.key) && <section className="bamboohr-sync-panel" aria-label={`Test et synchronisation ${integration.name}`}>
          <div className="bamboohr-sync-heading"><strong>Connexion et import des collaborateurs</strong><span className={`bamboohr-sync-state ${sync?.status || 'idle'}`}>{sync?.status || 'Prêt'}</span></div>
          <p>Le test vérifie les identifiants et l’accès en lecture. L’import crée ou actualise les collaborateurs rattachés à cette organisation.</p>
          <div className="bamboohr-sync-actions">
            <button type="button" className="integration-modal-cancel" onClick={verifyBambooHRConnection} disabled={!configured || checkingConnection || startingSync}>{checkingConnection ? 'Vérification…' : 'Tester la connexion'}</button>
            <button type="button" className="integration-modal-submit" onClick={runBambooHRSync} disabled={!configured || startingSync || ['queued', 'running'].includes(sync?.status)}>{startingSync ? 'Mise en file…' : 'Importer les collaborateurs'}</button>
          </div>
          {!configured && <small>Enregistrez d’abord les identifiants {integration.name}.</small>}
          {connectionState && <div className={`bamboohr-connection-result ${connectionState.ok ? 'success' : 'error'}`} role={connectionState.ok ? 'status' : 'alert'}>{connectionState.message}</div>}
          {sync && <div className={`bamboohr-sync-result ${sync.status === 'failed' ? 'error' : ''}`} role={sync.status === 'failed' ? 'alert' : 'status'}>
            {sync.status === 'queued' && 'Synchronisation en attente du worker…'}
            {sync.status === 'running' && `Import en cours · ${sync.records_synced || 0} collaborateur(s) traité(s)`}
            {sync.status === 'succeeded' && `Dernier import réussi · ${sync.records_synced} collaborateur(s)${integration.key === 'frappehr' ? ` · ${sync.absence_records_synced || 0} absence(s)` : ''} · ${sync.last_success_at ? new Date(sync.last_success_at).toLocaleString() : ''}`}
            {sync.status === 'failed' && (sync.last_error || 'La synchronisation a échoué.')}
          </div>}
        </section>}
        {integration.fields.length === 0 ? (
          <div className="integration-setup-note" role="status">
            Aucun identifiant ne peut être demandé ici tant que l’accès API direct à {integration.name} n’est pas confirmé.
          </div>
        ) : <form onSubmit={submit}>
          <div className="integration-credential-fields">
            {integration.fields.map((field, index) => {
              const inputType = field.secret ? (visible[field.name] ? 'text' : 'password') : (field.type || 'text');
              return <label className="integration-credential-field" key={field.name}>
                <span>{field.label}</span>
                <span className="integration-input-wrap">
                  <input ref={index === 0 ? firstField : undefined} name={field.name} type={inputType} value={credentials[field.name]} onChange={(event) => { setCredentials((current) => ({ ...current, [field.name]: event.target.value })); setSaved(false); }} placeholder={field.placeholder || ''} required={field.required !== false} autoComplete={field.autoComplete || 'off'} spellCheck="false" />
                  {field.secret && <button className="integration-reveal-button" type="button" onClick={() => setVisible((current) => ({ ...current, [field.name]: !current[field.name] }))} aria-label={visible[field.name] ? `Masquer ${field.label}` : `Afficher ${field.label}`} title={visible[field.name] ? 'Masquer' : 'Afficher'}>{visible[field.name] ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>}
                </span>
                {field.hint && <small className="integration-field-hint">{field.hint}</small>}
              </label>;
            })}
          </div>
          {error && <p className="integration-modal-error" role="alert">{error}</p>}
          <footer className="integration-modal-actions"><button type="button" className="integration-modal-cancel" onClick={onClose} disabled={saving}>Annuler</button><button type="submit" className="integration-modal-submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les accès'}</button></footer>
        </form>}
      </section>
    </div>
  );
}

export default function IntegrationsPage() {
  const [selected, setSelected] = useState(null);
  const [savedKeys, setSavedKeys] = useState(() => new Set());
  const [integrationStates, setIntegrationStates] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const closeModal = useCallback(() => setSelected(null), []);
  const requiresSetup = integrations.filter((item) => !savedKeys.has(item.key)).length;

  useEffect(() => {
    let active = true;
    getIntegrations().then((result) => {
      if (active) {
        const items = result.integrations || [];
        setSavedKeys(new Set(items.filter((item) => item.credentials_saved).map((item) => item.key)));
        setIntegrationStates(Object.fromEntries(items.map((item) => [item.key, item])));
      }
    }).catch(() => { if (active) setStatusMessage('État des intégrations indisponible. Vérifiez que le backend est démarré.'); });
    return () => { active = false; };
  }, []);

  return (
    <div className="workspace-page workspace-integrations-page">
      <WorkspaceHeader index="02" kicker="ÉCOSYSTÈME CONNECTÉ" title="Intégrations" description="Reliez les outils de votre organisation et gérez leurs accès depuis un espace dédié." />
      {statusMessage && <p className="integration-load-error" role="status">{statusMessage}</p>}
      <section className="integration-overview" aria-label="Résumé des intégrations">
        <div className="integration-overview-intro"><span className="integration-overview-icon"><Plug size={18} aria-hidden="true" /></span><div><span className="module-section-kicker">ÉCOSYSTÈME INCUVA</span><h3>Vos outils, au même endroit.</h3></div></div>
        <div className="integration-overview-stats"><div><strong>{integrations.length}</strong><span>connecteurs disponibles</span></div><div><strong>{requiresSetup}</strong><span>à configurer</span></div></div>
      </section>
      <div className="integration-trust-note"><ShieldCheck size={15} aria-hidden="true" /><span>Les identifiants sont chiffrés côté serveur et isolés par organisation. Leur enregistrement ne vérifie pas encore la connexion au service.</span></div>
      <div className="integration-groups">
        {groups.map((group) => {
          const items = integrations.filter((item) => item.group === group);
          return <section className="integration-group" key={group} aria-labelledby={`integration-group-${integrations.find((item) => item.group === group)?.key}`}>
            <header className="integration-group-heading"><div><span className="module-section-kicker">CATÉGORIE</span><h3 id={`integration-group-${integrations.find((item) => item.group === group)?.key}`}>{group}</h3></div><span>{String(items.length).padStart(2, '0')} outils</span></header>
            <div className="integration-card-grid">
              {items.map((item) => {
                const configured = savedKeys.has(item.key);
                const connection = integrationStates[item.key];
                const connectionStatus = connection?.connection_status || (configured ? 'unverified' : 'not_configured');
                const statusLabels = { connected: 'Connectée', failed: 'Échec de connexion', unverified: 'À vérifier', not_configured: item.state };
                return <button className="integration-card" type="button" key={item.key} onClick={() => setSelected(item)} aria-label={`${configured ? 'Modifier les accès de' : 'Configurer'} ${item.name}`}>
                  <span className="integration-card-top"><span className={`workspace-integration-mark mark-${item.mark.toLowerCase()} mark-integration-${item.key}`} aria-hidden="true">{item.mark}</span><span className={`workspace-state-pill ${configured ? 'configured' : 'setup'}`}><span />{configured ? 'Identifiants enregistrés' : item.state}</span></span>
                  {configured && <span className={`integration-connection-pill ${connectionStatus}`}><span />{statusLabels[connectionStatus]}{connection?.connection_checked_at ? ` · ${new Date(connection.connection_checked_at).toLocaleDateString('fr-FR')}` : ''}</span>}
                  {connection?.sync?.status === 'failed' && <span className="integration-card-connection-error">Échec du dernier import : {connection.sync.last_error || 'consultez le détail du connecteur.'}</span>}
                  <span className="integration-card-copy"><span className="integration-card-title">{item.name}</span><span className="integration-card-description">{item.description}</span></span>
                  {connectionStatus === 'failed' && connection?.connection_error && <span className="integration-card-connection-error">{connection.connection_error}</span>}
                  <span className="integration-card-footer"><span>{item.protocol}</span><span className={configured ? 'integration-config-ready' : 'integration-config-required'}>{configured ? <><CheckCircle2 size={13} aria-hidden="true" />Modifier les accès</> : <><Settings2 size={13} aria-hidden="true" />Configurer</>}</span></span>
                </button>;
              })}
            </div>
          </section>;
        })}
      </div>
      <p className="workspace-footnote"><ShieldCheck size={14} aria-hidden="true" /> Les secrets saisis ne sont ni conservés dans le navigateur ni renvoyés par l’API.</p>
      {selected && <CredentialsModal integration={{ ...selected, connectionStatus: integrationStates[selected.key]?.connection_status, connectionError: integrationStates[selected.key]?.connection_error }} initiallyConfigured={savedKeys.has(selected.key)} onClose={closeModal} onSaved={(key) => { setSavedKeys((current) => new Set([...current, key])); setIntegrationStates((current) => ({ ...current, [key]: { ...current[key], credentials_saved: true, connection_status: 'unverified', connection_checked_at: null, connection_error: null } })); setStatusMessage(''); }} onConnectionUpdated={(key, status) => setIntegrationStates((current) => ({ ...current, [key]: { ...current[key], ...status } }))} />}
    </div>
  );
}
