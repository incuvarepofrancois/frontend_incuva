import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { login } from '../services/api';
import { setTokens } from '../services/auth';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ email, password: pass });
      if (data?.access_token && data?.refresh_token && data?.user) {
        setTokens(data);
        window.dispatchEvent(new CustomEvent('incuva:authenticated', { detail: data.user }));
        navigate('/dashboard');
      } else {
        setError('Identifiants incorrects. Vérifiez votre adresse e-mail et votre mot de passe.');
      }
    } catch (loginError) {
      setError(loginError.status === 401
        ? 'Identifiants incorrects. Vérifiez votre adresse e-mail et votre mot de passe.'
        : 'Connexion impossible. Vérifiez que le serveur est démarré puis réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="login-story" aria-label="À propos d’INCUVA">
          <a className="login-brand" href="/" aria-label="INCUVA, accueil">
            <span className="login-brand-mark" aria-hidden="true">i</span>
            <span>INCUVA</span>
          </a>

          <div className="login-story-copy">
            <span className="login-eyebrow">PEOPLE INTELLIGENCE</span>
            <h1>Les données éclairent.<br /><span>Les équipes décident.</span></h1>
            <p>Retrouvez votre espace de travail et les outils d’analyse de votre organisation.</p>
          </div>

          <div className="login-trust-note">
            <ShieldCheck size={17} strokeWidth={1.7} aria-hidden="true" />
            <span>Un accès réservé aux membres de votre organisation</span>
          </div>
          <div className="login-story-index" aria-hidden="true">INCUVA <span>·</span> DATA PLATFORM</div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-heading">
            <span className="login-mobile-brand">INCUVA <span>·</span> DATA PLATFORM</span>
            <span className="login-form-kicker">VOTRE ESPACE</span>
            <h2>Connexion</h2>
            <p>Connectez-vous avec vos identifiants professionnels.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Adresse e-mail</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nom@entreprise.fr"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Mot de passe</label>
              <input
                id="login-password"
                type="password"
                value={pass}
                onChange={(event) => setPass(event.target.value)}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <div className="login-error" role="alert">{error}</div>}

            <button className="login-submit" type="submit" disabled={loading} aria-busy={loading}>
              {loading ? (
                <><span className="login-spinner" aria-hidden="true" />Connexion en cours</>
              ) : (
                <>Se connecter <ArrowRight size={16} aria-hidden="true" /></>
              )}
            </button>
          </form>

          <div className="login-security-note">
            <LockKeyhole size={14} strokeWidth={1.7} aria-hidden="true" />
            <span>Connexion sécurisée</span>
          </div>
          <p className="login-signup-link">Pas encore de compte ? <Link to="/register">Créer un compte</Link></p>
          <p className="login-copyright">INCUVA © {new Date().getFullYear()}</p>
        </section>
      </div>
    </main>
  );
}
