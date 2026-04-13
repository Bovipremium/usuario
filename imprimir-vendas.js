// Funcao para imprimir vendas com layout profissional
function imprimirVenda(idx) {
  try {
    var venda = clienteAtual.Vendas[idx];
    if (!venda) {
      alert('Venda nao encontrada');
      return;
    }
    
    var dataAtual = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    var valorTotal = 0;
    var htmlProdutos = '';
    if (venda.Produtos && venda.Produtos.length > 0) {
      venda.Produtos.forEach(function(p) {
        var qtd = parseFloat(p.Quantidade) || 0;
        var valor = parseFloat(p.Valor) || 0;
        var subTotal = qtd * valor;
        valorTotal += subTotal;
        htmlProdutos += '<tr>';
        htmlProdutos += '<td style="width: 50%; padding: 8px; border-bottom: 1px solid #ecf0f1;">' + (p.Nome || '') + '</td>';
        htmlProdutos += '<td style="text-align: center; width: 12%; padding: 8px; border-bottom: 1px solid #ecf0f1;">' + qtd + '</td>';
        htmlProdutos += '<td style="text-align: right; width: 18%; padding: 8px; border-bottom: 1px solid #ecf0f1;">R$ ' + valor.toLocaleString('pt-BR', {minimumFractionDigits: 2}) + '</td>';
        htmlProdutos += '<td style="text-align: right; width: 20%; padding: 8px; border-bottom: 1px solid #ecf0f1; font-weight: bold;">R$ ' + subTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2}) + '</td>';
        htmlProdutos += '</tr>';
      });
    }
    
    var htmlParcelas = '';
    if (venda.Parcelas && venda.Parcelas.length > 0) {
      venda.Parcelas.forEach(function(p, i) {
        var dataParcela = new Date(p.DataVencimento);
        var isPago = p.Pago === true || p.Pago === 'true' || p.Pago === 1;
        htmlParcelas += '<tr>';
        htmlParcelas += '<td style="padding: 4px 6px; border-bottom: 1px solid #e0e0e0; text-align: center; font-size: 10px;"><strong>' + (i + 1) + '</strong></td>';
        htmlParcelas += '<td style="padding: 4px 6px; border-bottom: 1px solid #e0e0e0; font-size: 10px;">' + dataParcela.toLocaleDateString('pt-BR') + '</td>';
        htmlParcelas += '<td style="text-align: right; padding: 4px 6px; border-bottom: 1px solid #e0e0e0; font-weight: bold; font-size: 10px;">R$ ' + (parseFloat(p.Valor) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2}) + '</td>';
        htmlParcelas += '</tr>';
      });
    }
    
    var htmlImpressao = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Comprovante de Venda</title><style>';
    htmlImpressao += '* { margin: 0; padding: 0; box-sizing: border-box; }';
    htmlImpressao += 'body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; max-width: 210mm; margin: 0 auto; padding: 20px; background: white; color: #333; line-height: 1.6; }';
    htmlImpressao += '.container { max-width: 100%; }';
    htmlImpressao += '@page { size: A4; margin: 10mm; }';
    htmlImpressao += '.cabecalho { display: flex; gap: 12px; align-items: center; justify-content: flex-start; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #1fa37a; }';
    htmlImpressao += '.cabecalho-logo img { height: 64px; object-fit: contain; }';
    htmlImpressao += '.cabecalho-empresa { font-size: 14px; font-weight: 700; color: #1fa37a; margin-bottom: 2px; }';
    htmlImpressao += '.cabecalho-info { font-size: 11px; line-height: 1.4; color: #666; }';
    htmlImpressao += '.secao-titulo { background: linear-gradient(135deg, #1fa37a 0%, #15a566 100%); color: white; padding: 12px 16px; margin-top: 20px; margin-bottom: 15px; font-weight: bold; font-size: 14px; border-radius: 4px; }';
    htmlImpressao += '.info-venda { display: flex; gap: 12px; margin-bottom: 10px; font-size: 11px; flex-wrap: wrap; }';
    htmlImpressao += '.info-box { background: #f5f5f5; padding: 12px; border-left: 4px solid #1fa37a; border-radius: 2px; flex: 1; min-width: 120px; }';
    htmlImpressao += '.info-box-label { font-weight: bold; color: #1fa37a; display: block; margin-bottom: 4px; }';
    htmlImpressao += '.info-box-valor { color: #333; font-size: 13px; }';
    htmlImpressao += '.cliente-info { font-size: 12px; line-height: 1.8; margin-bottom: 15px; }';
    htmlImpressao += '.cliente-info-linha { display: flex; gap: 8px; margin-bottom: 6px; }';
    htmlImpressao += '.cliente-info-label { font-weight: bold; color: #1fa37a; }';
    htmlImpressao += '.cliente-info-valor { color: #333; }';
    htmlImpressao += 'table { width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 20px; }';
    htmlImpressao += 'table thead { background: #ecf0f1; border-top: 2px solid #1fa37a; border-bottom: 2px solid #1fa37a; }';
    htmlImpressao += 'table th { padding: 12px 8px; text-align: left; font-weight: bold; color: #1fa37a; }';
    htmlImpressao += 'table tbody tr:last-child td { border-bottom: 2px solid #1fa37a; }';
    htmlImpressao += '.resumo { background: linear-gradient(135deg, #f0f9f7 0%, #e8f5f2 100%); padding: 10px; margin: 10px 0; border: 1px solid #1fa37a; border-radius: 4px; font-size: 12px; }';
    htmlImpressao += '.resumo-linha { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #ddd; }';
    htmlImpressao += '.resumo-linha:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }';
    htmlImpressao += '.resumo-label { font-weight: bold; color: #333; }';
    htmlImpressao += '.resumo-valor { color: #1fa37a; font-weight: bold; font-size: 14px; }';
    htmlImpressao += '.resumo-total { font-size: 16px; color: #1fa37a; padding-top: 10px; border-top: 2px solid #1fa37a !important; margin-top: 10px !important; padding-bottom: 0 !important; margin-bottom: 0 !important; border-bottom: none !important; }';
    htmlImpressao += '.rodape { text-align: center; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 2px solid #1fa37a; line-height: 1.8; color: #666; }';
    htmlImpressao += '.data-emissao { text-align: right; font-size: 11px; color: #999; margin-bottom: 10px; font-style: italic; }';
    htmlImpressao += '@media print { body { max-width: 100%; margin: 0; padding: 0; } .container { max-width: 100%; } }';
    htmlImpressao += '</style></head><body><div class="container">';
    
    htmlImpressao += '<div class="cabecalho"><div class="cabecalho-logo"><img src="assets/img/logo.png" alt="Logo" /></div><div><div class="cabecalho-empresa">COMPROVANTE DE VENDA</div><div class="cabecalho-info"><strong>Empresa BOVI PREMIUM NUTRICAO ANIMAL</strong> | CNPJ: 55.951.841/1000-76</div></div></div>';
    htmlImpressao += '<div class="data-emissao">Emitido em: ' + dataAtual + '</div>';
    
    htmlImpressao += '<div class="info-venda">';
    htmlImpressao += '<div class="info-box"><span class="info-box-label">Numero NF</span><span class="info-box-valor">' + (venda.NumeroNF || 'N/A') + '</span></div>';
    htmlImpressao += '<div class="info-box"><span class="info-box-label">Data Venda</span><span class="info-box-valor">' + new Date(venda.DataVenda).toLocaleDateString('pt-BR') + '</span></div>';
    htmlImpressao += '<div class="info-box"><span class="info-box-label">Tipo Venda</span><span class="info-box-valor">' + (venda.TipoVenda || 'N/A') + '</span></div>';
    htmlImpressao += '<div class="info-box"><span class="info-box-label">Animais</span><span class="info-box-valor">' + (venda.QuantidadeAnimais || 0) + '</span></div>';
    htmlImpressao += '</div>';
    
    htmlImpressao += '<div class="secao-titulo">👤 DADOS DO CLIENTE</div>';
    htmlImpressao += '<div class="cliente-info">';
    htmlImpressao += '<div class="cliente-info-linha"><strong>Nome:</strong> ' + (clienteAtual.Nome || 'N/A') + '</div>';
    htmlImpressao += '<div class="cliente-info-linha"><strong>CPF/CNPJ:</strong> ' + (clienteAtual.CPF || 'N/A') + '</div>';
    htmlImpressao += '<div class="cliente-info-linha"><strong>Inscricao:</strong> ' + (clienteAtual.Inscricao || 'N/A') + '</div>';
    htmlImpressao += '<div class="cliente-info-linha"><strong>Endereco:</strong> ' + (clienteAtual.Endereco || '') + ' ' + (clienteAtual.NumeroEndereco || '') + ' ' + (clienteAtual.ComplementoEndereco || '') + '</div>';
    htmlImpressao += '<div class="cliente-info-linha"><strong>Bairro:</strong> ' + (clienteAtual.Bairro || 'N/A') + ' <strong>CEP:</strong> ' + (clienteAtual.CEP || '') + '</div>';
    htmlImpressao += '<div class="cliente-info-linha"><strong>Cidade/Estado:</strong> ' + (clienteAtual.Cidade || 'N/A') + ', ' + (clienteAtual.Estado || 'N/A') + '</div>';
    htmlImpressao += '<div class="cliente-info-linha"><strong>Telefone:</strong> ' + (clienteAtual.Telefone1 || 'N/A') + ' <strong>Tel2:</strong> ' + (clienteAtual.Telefone2 || '') + '</div>';
    htmlImpressao += '<div class="cliente-info-linha"><strong>E-mail:</strong> ' + (clienteAtual.Email || 'N/A') + '</div>';
    htmlImpressao += '</div>';
    
    htmlImpressao += '<div class="secao-titulo">📦 PRODUTOS</div>';
    htmlImpressao += '<table><thead><tr><th style="width: 50%;">Descricao</th><th style="text-align: center; width: 12%;">Qtd</th><th style="text-align: right; width: 18%;">Valor Unit.</th><th style="text-align: right; width: 20%;">Total</th></tr></thead><tbody>';
    htmlImpressao += htmlProdutos || '<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhum produto registrado</td></tr>';
    htmlImpressao += '</tbody></table>';
    
    htmlImpressao += '<div style="font-size: 12px; font-weight: bold; color: #1fa37a; margin-top: 15px; margin-bottom: 8px;">💳 FORMAS DE PAGAMENTO</div>';
    htmlImpressao += '<table style="font-size: 10px; margin-bottom: 10px;"><thead><tr><th style="text-align: center; padding: 4px 6px; border-bottom: 1px solid #1fa37a; font-size: 9px;">Parc.</th><th style="padding: 4px 6px; border-bottom: 1px solid #1fa37a; font-size: 9px;">Vencimento</th><th style="text-align: right; padding: 4px 6px; border-bottom: 1px solid #1fa37a; font-size: 9px;">Valor</th></tr></thead><tbody>';
    htmlImpressao += htmlParcelas || '<tr><td colspan="3" style="text-align: center; padding: 8px; font-size: 9px;">Nenhuma parcela registrada</td></tr>';
    htmlImpressao += '</tbody></table>';
    
    htmlImpressao += '<div class="resumo"><div class="resumo-linha"><span class="resumo-label">Subtotal:</span><span class="resumo-valor">R$ ' + valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2}) + '</span></div>';
    htmlImpressao += '<div class="resumo-linha"><span class="resumo-label">Quantidade Parcelas:</span><span class="resumo-valor">' + (venda.NumeroParcelas || 1) + 'x</span></div>';
    htmlImpressao += '<div class="resumo-linha resumo-total"><span class="resumo-label">VALOR TOTAL:</span><span class="resumo-valor" style="font-size: 18px;">💰 R$ ' + valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2}) + '</span></div></div>';
    
    htmlImpressao += '<div class="rodape"><div style="font-size: 14px; margin-bottom: 5px;">✅ 📄 ✅</div><div>Documento emitido automaticamente pelo sistema</div><div style="margin-top: 10px; font-size: 10px;">Obrigado pela preferencia!</div></div>';
    
    htmlImpressao += '</div></body></html>';
    
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.id = 'framePrint_' + Date.now();
    document.body.appendChild(iframe);
    
    var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlImpressao);
    iframeDoc.close();
    
    iframe.onload = function() {
      setTimeout(function() {
        try {
          iframe.contentWindow.print();
          setTimeout(function() {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 500);
        } catch (e) {
          console.error('Erro ao imprimir:', e);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          alert('Erro ao imprimir: ' + e.message);
        }
      }, 500);
    };
  } catch (e) {
    console.error('Erro ao imprimir:', e);
    alert('Erro ao imprimir: ' + e.message);
  }
}
