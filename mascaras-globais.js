/*
 * ============================================================
 * MÁSCARAS GLOBAIS - SITE WALLYSON
 * Mantém a máscara visual separada do valor numérico usado nos cálculos.
 * ============================================================
 */
(function () {
  'use strict';

  if (window.__MASCARAS_GLOBAIS_SITE_WALLYSON__) return;
  window.__MASCARAS_GLOBAIS_SITE_WALLYSON__ = true;

  const SELETORES_MOEDA = [
    '#inputValor',
    '#editValor',
    '#novoValorPago',
    '#vendaValorTotal',
    '.produtoValorUN',
    '.produtoValor',
    '[id^="parcValor"]',
    '.produto-valor',
    '.parcela-valor',
    '.valor-despesa',
    '#valorFrete',
    '#custoPorKgReceita',
    '#valorMateria',
    '#metaProLabore',
    '#metaProLaboreMinima',
    '#filtroValorMin',
    '#filtroValorMax'
  ];

  const SELETORES_CPF_CNPJ = [
    '#cpf',
    '#representanteCPF'
  ];

  const SELETORES_TELEFONE = [
    '#telefone1',
    '#telefone2',
    '#editTelefone1',
    '#editTelefone2',
    '#telefonOutro',
    '#numero',
    '#inputNumeroModal',
    '#agendNumero'
  ];

  const SELETORES_CEP = [
    '#cep',
    '#editCEP'
  ];

  function somenteDigitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
  }

  function parseMoedaBR(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
    let texto = String(valor ?? '').trim();
    if (!texto) return 0;

    texto = texto.replace(/R\$\s*/gi, '').replace(/\s/g, '');

    if (texto.includes(',') && texto.includes('.')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    texto = texto.replace(/[^\d.-]/g, '');
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  }

  function formatarMoedaValor(valor) {
    const numero = Number(valor);
    return 'R$ ' + (Number.isFinite(numero) ? numero : 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatarMoedaPorDigitos(valor) {
    const digitos = somenteDigitos(valor);
    if (!digitos) return '';
    return formatarMoedaValor(Number(digitos) / 100);
  }

  function formatarCpfCnpj(valor) {
    const digitos = somenteDigitos(valor).slice(0, 14);
    if (!digitos) return '';

    if (digitos.length <= 11) {
      return digitos
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    return digitos
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  function formatarTelefone(valor) {
    let digitos = somenteDigitos(valor);
    if (digitos.length > 11 && digitos.startsWith('55')) digitos = digitos.slice(2);
    digitos = digitos.slice(0, 11);
    if (!digitos) return '';

    if (digitos.length <= 10) {
      return digitos
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    }

    return digitos
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }

  function formatarCep(valor) {
    const digitos = somenteDigitos(valor).slice(0, 8);
    return digitos.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
  }

  function prepararInputTexto(el, inputMode) {
    if (!el) return;
    if (el.getAttribute('type') === 'number') el.setAttribute('type', 'text');
    if (inputMode) el.setAttribute('inputmode', inputMode);
    el.setAttribute('autocomplete', 'off');
  }

  function aplicarMascaraMoeda(el) {
    if (!el || el.dataset.mascaraMoedaAplicada === '1') return;
    el.dataset.mascaraMoedaAplicada = '1';
    prepararInputTexto(el, 'numeric');

    if (el.value) el.value = formatarMoedaValor(parseMoedaBR(el.value));

    el.addEventListener('focus', () => {
      if (!el.readOnly && parseMoedaBR(el.value) === 0) el.select();
    });

    el.addEventListener('input', () => {
      el.value = formatarMoedaPorDigitos(el.value);
    });

    el.addEventListener('blur', () => {
      if (el.value) el.value = formatarMoedaValor(parseMoedaBR(el.value));
    });
  }

  function aplicarMascaraCpfCnpj(el) {
    if (!el || el.dataset.mascaraCpfCnpjAplicada === '1') return;
    el.dataset.mascaraCpfCnpjAplicada = '1';
    prepararInputTexto(el, 'numeric');
    if (el.value) el.value = formatarCpfCnpj(el.value);
    el.addEventListener('input', () => { el.value = formatarCpfCnpj(el.value); });
  }

  function aplicarMascaraTelefone(el) {
    if (!el || el.dataset.mascaraTelefoneAplicada === '1') return;
    el.dataset.mascaraTelefoneAplicada = '1';
    prepararInputTexto(el, 'tel');
    if (el.value) el.value = formatarTelefone(el.value);
    el.addEventListener('input', () => { el.value = formatarTelefone(el.value); });
  }

  function aplicarMascaraCep(el) {
    if (!el || el.dataset.mascaraCepAplicada === '1') return;
    el.dataset.mascaraCepAplicada = '1';
    prepararInputTexto(el, 'numeric');
    if (el.value) el.value = formatarCep(el.value);
    el.addEventListener('input', () => { el.value = formatarCep(el.value); });
  }

  function aplicarNoEscopo(root) {
    const escopo = root && root.querySelectorAll ? root : document;
    escopo.querySelectorAll(SELETORES_MOEDA.join(',')).forEach(aplicarMascaraMoeda);
    escopo.querySelectorAll(SELETORES_CPF_CNPJ.join(',')).forEach(aplicarMascaraCpfCnpj);
    escopo.querySelectorAll(SELETORES_TELEFONE.join(',')).forEach(aplicarMascaraTelefone);
    escopo.querySelectorAll(SELETORES_CEP.join(',')).forEach(aplicarMascaraCep);
  }

  function definirMoedaInput(el, valor) {
    if (!el) return;
    aplicarMascaraMoeda(el);
    el.value = formatarMoedaValor(valor);
  }

  window.valorNumerico = parseMoedaBR;
  window.parseMoedaBR = parseMoedaBR;
  window.definirMoedaInput = definirMoedaInput;
  window.MascarasGlobais = {
    reaplicar: () => aplicarNoEscopo(document),
    parseMoedaBR,
    formatarMoedaValor,
    formatarCpfCnpj,
    formatarTelefone,
    formatarCep
  };

  function iniciar() {
    aplicarNoEscopo(document);

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.matches && node.matches('input')) aplicarNoEscopo(node.parentElement || document);
            else aplicarNoEscopo(node);
          }
        });
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
