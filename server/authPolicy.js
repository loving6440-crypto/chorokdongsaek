// 회원가입에만 적용하는 강화 정책. 기존 계정 로그인/레거시 복원에는 적용하지 않는다.
export const NEW_ID_RULE = /^[A-Za-z]{8,40}$/
export const validNewPassword = (password) =>
  typeof password === 'string' && password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)
