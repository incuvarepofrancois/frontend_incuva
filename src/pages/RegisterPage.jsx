import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, ShieldCheck } from 'lucide-react';
import { register } from '../services/api';
import { setTokens } from '../services/auth';
import './RegisterPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const data = await register({ organization_name: organizationName, email, password });
      if (data?.access_token && data?.refresh_token && data?.user) {
        setTokens(data);
        window.dispatchEvent(new CustomEvent('incuva:authenticated', { detail: data.user }));
        navigate('/dashboard');
      } else {
        setError('La création du compte a échoué. Réessayez.');
      }
    } catch (registrationError) {
      if (registrationError.status === 409) {
        setError('Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou utilisez une autre adresse.');
      } else if (registrationError.status === 400) {
        setError(registrationError.message || 'Vérifiez les informations saisies.');
      } else if (registrationError.status === 404) {
        setError("La route d’inscription est introuvable. Redémarrez le backend pour charger la dernière version.");
      } else {
        setError('Création du compte impossible. Vérifiez que le serveur est démarré puis réessayez.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <div className="register-shell">
        <section className="register-story" aria-label="À propos d’INCUVA">
          <Link className="register-brand" to="/login" aria-label="INCUVA, connexion">
            <span className="register-brand-mark" aria-hidden="true">i</span><span>INCUVA</span>
          </Link>
          <div className="register-story-copy">
            <span className="register-eyebrow">PEOPLE INTELLIGENCE</span>
            <h1>Votre espace.<br /><span>Vos décisions.</span></h1>
            <p>Créez l’espace de travail de votre organisation pour commencer avec INCUVA.</p>
          </div>
          <div className="register-trust-note"><ShieldCheck size={17} strokeWidth={1.7} aria-hidden="true" /><span>Votre organisation et ses données restent dans un espace dédié.</span></div>
          <div className="register-story-index" aria-hidden="true">INCUVA <span>·</span> DATA PLATFORM</div>
        </section>

        <section className="register-form-panel">
          <div className="register-form-heading">
            <span className="register-mobile-brand">INCUVA <span>·</span> DATA PLATFORM</span>
            <span className="register-form-kicker">NOUVEL ESPACE</span>
            <h2>Créer un compte</h2>
            <p>Le premier compte créé devient administrateur de l’organisation.</p>
          </div>
          <form className="register-form" onSubmit={handleSubmit}>
            <div className="register-field">
              <label htmlFor="register-organization">Nom de l’organisation</label>
              <div className="register-input-wrap"><Building2 size={16} aria-hidden="true" /><input id="register-organization" type="text" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Votre entreprise" autoComplete="organization" maxLength={255} required /></div>
            </div>
            <div className="register-field">
              <label htmlFor="register-email">Adresse e-mail</label>
              <input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@entreprise.fr" autoComplete="email" autoCapitalize="none" spellCheck="false" maxLength={255} required />
            </div>
            <div className="register-field">
              <label htmlFor="register-password">Mot de passe <span>12 caractères minimum</span></label>
              <input id="register-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Choisissez un mot de passe" autoComplete="new-password" minLength={12} maxLength={1024} required />
            </div>
            <div className="register-field">
              <label htmlFor="register-confirmation">Confirmer le mot de passe</label>
              <input id="register-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Saisissez-le à nouveau" autoComplete="new-password" required />
            </div>
            {error && <div className="register-error" role="alert">{error}</div>}
            <button className="register-submit" type="submit" disabled={loading} aria-busy={loading}>
              {loading ? <><span className="register-spinner" aria-hidden="true" />Création en cours</> : <>Créer mon espace <ArrowRight size={16} aria-hidden="true" /></>}
            </button>
          </form>
          <p className="register-login-link">Déjà un compte ? <Link to="/login">Se connecter</Link></p>
          <p className="register-copyright">INCUVA © {new Date().getFullYear()}</p>
        </section>
      </div>
    </main>
  );
}
