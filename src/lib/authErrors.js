// O Supabase devolve as mensagens em inglês; traduz as mais comuns.
const RULES = [
  [/captcha/i, "Não foi possível confirmar a verificação de segurança. Tente de novo."],
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam)."],
  // não confirma se o e-mail já existe (evita enumeração de contas)
  [/user already registered|already been registered/i, "Não foi possível criar a conta com esses dados. Se você já tem cadastro, entre ou use “Esqueci minha senha”."],
  [/password should be at least/i, "A senha é curta demais."],
  [/unable to validate email|invalid.*email/i, "E-mail inválido."],
  [/rate limit|too many requests|after \d+ seconds/i, "Muitas tentativas seguidas. Espere um minuto e tente de novo."],
  [/signups? not allowed|signup.*disabled/i, "Novos cadastros estão desativados. Peça acesso a um administrador."],
  [/same password|different from the old/i, "A nova senha precisa ser diferente da atual."],
  [/failed to fetch|network|load failed/i, "Sem conexão com o servidor. Confira a internet e tente de novo."],
  [/provider.*not enabled|unsupported provider/i, "Login com Google ainda não foi ativado neste projeto."],
];

export const translateAuthError = (message) => {
  if (!message) return "Algo deu errado. Tente de novo.";
  const hit = RULES.find(([re]) => re.test(message));
  return hit ? hit[1] : message;
};
