import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Tela de entrada do app (Supabase Auth).
// Modos: entrar com senha, receber link de acesso por e-mail, criar conta,
// esqueci a senha e definir nova senha (ao voltar do e-mail de recuperação).

const LOGO = '/img/522fde112_LOGO-PNG.png';

function destinoSeguro() {
  const next = new URLSearchParams(window.location.search).get('next') || '/';
  // só aceita caminhos internos do próprio app
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/';
}

const MENSAGENS = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  'User already registered': 'Este e-mail já tem cadastro. Use "Entrar" ou "Esqueci minha senha".',
  'Password should be at least 6 characters.': 'A senha precisa ter pelo menos 6 caracteres.',
};
const traduz = (msg) => MENSAGENS[msg] || (/rate limit/i.test(msg) ? 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.' : msg);

export default function Login() {
  const params = new URLSearchParams(window.location.search);
  const [modo, setModo] = useState(params.get('modo') === 'nova-senha' ? 'nova-senha' : 'entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setModo('nova-senha');
      else if (event === 'SIGNED_IN' && modo !== 'nova-senha') window.location.replace(destinoSeguro());
    });
    // já está logado? segue direto
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && modo !== 'nova-senha') window.location.replace(destinoSeguro());
    });
    return () => sub.subscription.unsubscribe();
  }, [modo]);

  const trocar = (m) => { setModo(m); setErro(''); setAviso(''); };

  async function enviar(e) {
    e.preventDefault();
    setErro(''); setAviso(''); setCarregando(true);
    const voltarPara = `${window.location.origin}/login?next=${encodeURIComponent(destinoSeguro())}`;
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      } else if (modo === 'link') {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: voltarPara, shouldCreateUser: true } });
        if (error) throw error;
        setAviso('Enviamos um link de acesso para o seu e-mail. Abra-o neste aparelho para entrar.');
      } else if (modo === 'criar') {
        const { data, error } = await supabase.auth.signUp({
          email, password: senha, options: { emailRedirectTo: voltarPara, data: { full_name: nome } },
        });
        if (error) throw error;
        if (!data.session) setAviso('Conta criada! Confirme pelo link que enviamos para o seu e-mail.');
      } else if (modo === 'esqueci') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login?modo=nova-senha` });
        if (error) throw error;
        setAviso('Se o e-mail tiver cadastro, você receberá um link para criar uma nova senha.');
      } else if (modo === 'nova-senha') {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw error;
        window.location.replace('/');
      }
    } catch (err) {
      setErro(traduz(err.message || String(err)));
    } finally {
      setCarregando(false);
    }
  }

  const titulos = {
    entrar: 'Entrar',
    link: 'Entrar com link no e-mail',
    criar: 'Criar conta',
    esqueci: 'Recuperar senha',
    'nova-senha': 'Definir nova senha',
  };
  const pedeEmail = modo !== 'nova-senha';
  const pedeSenha = ['entrar', 'criar', 'nova-senha'].includes(modo);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-amber-100 p-8">
        <div className="text-center mb-6">
          <img src={LOGO} alt="Tropeiros do Bebedouro" className="h-20 mx-auto mb-3 object-contain" />
          <h1 className="text-xl font-bold text-[#8B6F47]">{titulos[modo]}</h1>
        </div>

        <form onSubmit={enviar} className="space-y-4">
          {modo === 'criar' && (
            <div className="space-y-1">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
            </div>
          )}
          {pedeEmail && (
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          )}
          {pedeSenha && (
            <div className="space-y-1">
              <Label htmlFor="senha">{modo === 'nova-senha' ? 'Nova senha' : 'Senha'}</Label>
              <Input id="senha" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)}
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />
            </div>
          )}

          {erro && <p className="text-sm text-red-700 bg-red-50 rounded-md p-2">{erro}</p>}
          {aviso && <p className="text-sm text-green-800 bg-green-50 rounded-md p-2">{aviso}</p>}

          <Button type="submit" disabled={carregando} className="w-full bg-[#8B6F47] hover:bg-[#6F5838] text-white">
            {carregando ? 'Aguarde…' : titulos[modo]}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-center text-[#8B6F47]">
          {modo !== 'entrar' && <button type="button" className="underline block w-full" onClick={() => trocar('entrar')}>Entrar com e-mail e senha</button>}
          {modo !== 'link' && modo !== 'nova-senha' && <button type="button" className="underline block w-full" onClick={() => trocar('link')}>Entrar com link no e-mail (sem senha)</button>}
          {modo !== 'esqueci' && modo !== 'nova-senha' && <button type="button" className="underline block w-full" onClick={() => trocar('esqueci')}>Esqueci minha senha</button>}
          {modo !== 'criar' && modo !== 'nova-senha' && <button type="button" className="underline block w-full" onClick={() => trocar('criar')}>Criar conta</button>}
        </div>
      </div>
    </div>
  );
}
