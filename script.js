// ⚠️ USAR CONFIG.API_URL do config.js (não duplicar URL aqui!)

let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;
let facialImageData = null;
let userLocation = null;
let contractData = {
    fullName: '', cpf: '', endereco: '', telefone: '', email: '',
    cidade: '', estado: '', cep: '', numeroNF: '', dataVenda: '',
    produtos: [], valorTotal: 0,
    date: new Date().toLocaleDateString('pt-BR'),
    company: 'Bovi Premium'
};

document.addEventListener('DOMContentLoaded', function () {
    initializeSignatureCanvas();
    loadClientDataFromGoogleDrive();
});

// ─── CANVAS DE ASSINATURA ────────────────────────────────────────────────────

function initializeSignatureCanvas() {
    signatureCanvas = document.getElementById('signatureCanvas');
    signatureCtx = signatureCanvas.getContext('2d');
    adjustCanvasSize();
    window.addEventListener('resize', adjustCanvasSize);
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    signatureCanvas.addEventListener('touchstart', handleTouch, { passive: false });
    signatureCanvas.addEventListener('touchmove', handleTouch, { passive: false });
    signatureCanvas.addEventListener('touchend', stopDrawing);
}

function adjustCanvasSize() {
    // Preserva o desenho ao redimensionar
    const imgData = signatureCtx ? signatureCtx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height) : null;
    signatureCanvas.width = Math.min(600, signatureCanvas.parentElement?.offsetWidth || 600);
    signatureCanvas.height = 200;
    if (imgData) signatureCtx.putImageData(imgData, 0, 0);
}

function startDrawing(e) {
    isDrawing = true;
    const { x, y } = getPos(e);
    signatureCtx.beginPath();
    signatureCtx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';
    signatureCtx.strokeStyle = '#1f2937';
    signatureCtx.lineTo(x, y);
    signatureCtx.stroke();
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = signatureCanvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (signatureCanvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (signatureCanvas.height / rect.height);
    if (e.type === 'touchstart') {
        isDrawing = true;
        signatureCtx.beginPath();
        signatureCtx.moveTo(x, y);
    } else if (e.type === 'touchmove' && isDrawing) {
        signatureCtx.lineWidth = 2;
        signatureCtx.lineCap = 'round';
        signatureCtx.lineJoin = 'round';
        signatureCtx.strokeStyle = '#1f2937';
        signatureCtx.lineTo(x, y);
        signatureCtx.stroke();
    }
}

function getPos(e) {
    const rect = signatureCanvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (signatureCanvas.width / rect.width),
        y: (e.clientY - rect.top) * (signatureCanvas.height / rect.height)
    };
}

function stopDrawing() {
    isDrawing = false;
    signatureCtx.closePath();
}

function clearSignature() {
    signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
}

function isCanvasEmpty(canvas) {
    if (!canvas || canvas.width === 0 || canvas.height === 0) return true;
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some(ch => ch !== 0);
}

// ─── CARREGAMENTO DE DADOS ───────────────────────────────────────────────────

function loadClientDataFromGoogleDrive() {
    document.getElementById('loadingMessage').textContent = 'Buscando dados do cliente no Google Drive...';

    AuthManager.requisicaoSegura(CONFIG.API_URL + '?action=getContrato')
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success' && data.contrato) {
                const j = data.contrato;
                if (j.cliente && j.venda) {
                    contractData = {
                        fullName: j.cliente.nome || '',
                        cpf: j.cliente.cpf || '',
                        endereco: j.cliente.endereco || '',
                        telefone: j.cliente.telefone1 || j.cliente.telefone2 || '',
                        email: j.cliente.email || '',
                        cidade: j.cliente.cidade || '',
                        estado: j.cliente.estado || '',
                        cep: j.cliente.cep || '',
                        numeroNF: j.venda.numeroNF || '',
                        dataVenda: j.venda.dataVenda ? new Date(j.venda.dataVenda).toLocaleDateString('pt-BR') : '',
                        produtos: (j.venda.produtos || []).map(p => ({
                            nome: p.Nome || '',
                            quantidade: p.Quantidade || 1,
                            peso: p.PesoUnidade || 0,
                            valor: p.Valor || 0,
                            valorUnitario: p.Valor || 0
                        })),
                        valorTotal: j.venda.valorTotal || 0,
                        date: new Date().toLocaleDateString('pt-BR'),
                        company: 'Bovi Premium'
                    };
                    console.log('✅ Dados carregados:', contractData);
                    generateContractContent();
                    goToStep(1);
                    document.getElementById('loadingMessage').textContent = 'Pronto!';
                } else {
                    throw new Error('Estrutura JSON inválida');
                }
            } else {
                throw new Error('Contrato não encontrado no Drive');
            }
        })
        .catch(err => {
            console.error('❌ Erro ao carregar:', err);
            document.getElementById('loadingMessage').textContent = `Erro: ${err.message}`;
        });
}

// ─── NAVEGAÇÃO ENTRE STEPS ───────────────────────────────────────────────────

function goToStep(stepNumber) {
    if (stepNumber === 3 && isCanvasEmpty(signatureCanvas)) {
        alert('Por favor, desenhe sua assinatura antes de continuar.');
        return;
    }

    // Para câmera ao sair do step 3
    if (stepNumber !== 3) {
        stopCamera();
    }

    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

    const target = document.getElementById('step' + stepNumber);
    if (target) {
        target.classList.add('active');
        if (stepNumber === 3) startCamera();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSuccess() {
    stopCamera();
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('successMessage');
    el.style.display = 'block';
    el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── CÂMERA ──────────────────────────────────────────────────────────────────

let cameraStream = null;

async function startCamera() {
    try {
        const video = document.getElementById('video');
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 400 }, height: { ideal: 300 }, facingMode: 'user' },
            audio: false
        });
        video.srcObject = cameraStream;
        video.onloadedmetadata = () => video.play();
        showFacialStatus('Câmera ativada. Posicione seu rosto.', 'success');
    } catch (err) {
        showFacialStatus('Erro ao acessar câmera: ' + err.message, 'error');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }
}

async function captureFacialRecognition() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    try {
        showFacialStatus('Capturando...', 'loading');
        document.getElementById('captureBtn').disabled = true;

        await new Promise(r => setTimeout(r, 500));

        canvas.width = video.videoWidth || 400;
        canvas.height = video.videoHeight || 300;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const hasContent = Array.from(imgData).some(v => v > 10);
        if (!hasContent) {
            showFacialStatus('Câmera não está capturando imagem.', 'error');
            document.getElementById('captureBtn').disabled = false;
            return;
        }

        facialImageData = canvas.toDataURL('image/jpeg', 0.85);
        stopCamera();

        showFacialStatus('✅ Imagem capturada! Obtendo localização...', 'success');
        await getLocation();

        showFacialStatus('📄 Gerando PDF e enviando...', 'loading');
        await new Promise(r => setTimeout(r, 800));
        await generateAndSendPDF();

    } catch (err) {
        console.error('Erro:', err);
        showFacialStatus('Erro: ' + err.message, 'error');
        document.getElementById('captureBtn').disabled = false;
    }
}

function showFacialStatus(message, type) {
    const el = document.getElementById('facialStatus');
    el.textContent = message;
    el.className = 'status-message ' + type;
}

// ─── GEOLOCALIZAÇÃO ───────────────────────────────────────────────────────────

function getLocation() {
    return new Promise(resolve => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
            pos => {
                userLocation = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: new Date().toLocaleString('pt-BR'),
                    mapLink: `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`
                };
                resolve(userLocation);
            },
            () => {
                userLocation = {
                    latitude: -23.5505, longitude: -46.6333,
                    accuracy: 'Aproximada',
                    timestamp: new Date().toLocaleString('pt-BR'),
                    mapLink: 'https://maps.google.com/?q=-23.5505,-46.6333'
                };
                resolve(userLocation);
            },
            { timeout: 8000 }
        );
    });
}

// ─── GERAÇÃO DE CONTRATO HTML ────────────────────────────────────────────────

function generateContractContent() {
    function fmtReal(v) {
        return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function valorExtenso(valor) {
        const n = Math.floor(valor);
        const c = Math.round((valor - n) * 100);
        const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
        const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
        const ctx = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte', 'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco', 'vinte e seis', 'vinte e sete', 'vinte e oito', 'vinte e nove', 'trinta', 'trinta e um', 'trinta e dois', 'trinta e três', 'trinta e quatro', 'trinta e cinco', 'trinta e seis', 'trinta e sete', 'trinta e oito', 'trinta e nove', 'quarenta', 'quarenta e um', 'quarenta e dois', 'quarenta e três', 'quarenta e quatro', 'quarenta e cinco', 'quarenta e seis', 'quarenta e sete', 'quarenta e oito', 'quarenta e nove', 'cinquenta', 'cinquenta e um', 'cinquenta e dois', 'cinquenta e três', 'cinquenta e quatro', 'cinquenta e cinco', 'cinquenta e seis', 'cinquenta e sete', 'cinquenta e oito', 'cinquenta e nove', 'sessenta', 'sessenta e um', 'sessenta e dois', 'sessenta e três', 'sessenta e quatro', 'sessenta e cinco', 'sessenta e seis', 'sessenta e sete', 'sessenta e oito', 'sessenta e nove', 'setenta', 'setenta e um', 'setenta e dois', 'setenta e três', 'setenta e quatro', 'setenta e cinco', 'setenta e seis', 'setenta e sete', 'setenta e oito', 'setenta e nove', 'oitenta', 'oitenta e um', 'oitenta e dois', 'oitenta e três', 'oitenta e quatro', 'oitenta e cinco', 'oitenta e seis', 'oitenta e sete', 'oitenta e oito', 'oitenta e nove', 'noventa', 'noventa e um', 'noventa e dois', 'noventa e três', 'noventa e quatro', 'noventa e cinco', 'noventa e seis', 'noventa e sete', 'noventa e oito', 'noventa e nove'];

        function ate999(num) {
            const cent = Math.floor(num / 100);
            const dez = Math.floor((num % 100) / 10);
            const un = num % 10;
            let t = '';
            if (cent) t += centenas[cent] + ' ';
            if (dez === 1) t += especiais[un] + ' ';
            else { if (dez) t += dezenas[dez] + ' '; if (un) t += unidades[un] + ' '; }
            return t.trim();
        }

        if (n === 0 && c === 0) return 'zero reais';
        let res = '';
        if (n >= 1000) res = ate999(Math.floor(n / 1000)) + ' mil ';
        if (n % 1000) res += ate999(n % 1000) + ' ';
        res = res.trim();
        res = res.charAt(0).toUpperCase() + res.slice(1) + ' reais';
        if (c > 0) res += ' e ' + ctx[c] + ' centavos';
        return res;
    }

    const endCompleto = [contractData.endereco, contractData.cidade, contractData.estado ? `- ${contractData.estado}` : ''].filter(Boolean).join(', ');
    const agora = new Date();
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const localSig = contractData.cidade && contractData.estado ? `${contractData.cidade}/${contractData.estado}` : 'Anápolis/GO';

    let produtosHTML = contractData.produtos.map((p, i) => {
        const tot = (p.quantidade || 1) * (p.valorUnitario || p.valor || 0);
        return `<p style="margin:4px 0;">${i + 1}. <strong>${p.nome}</strong>: ${p.quantidade || 1} un. (${p.peso || 0}kg) — R$ ${fmtReal(tot)}</p>`;
    }).join('');

    const content = `
<div style="font-family: Georgia, serif; line-height: 1.7; color: #222; font-size: 12px; max-width: 700px; margin: 0 auto;">
    <p style="text-align:center; font-weight:bold; font-size:13px; margin-bottom:20px; letter-spacing:0.5px;">
        CONTRATO DE COMPRA E VENDA COM<br>RESERVA DE DOMÍNIO E OUTRAS AVENÇAS
    </p>
    <p><strong>VENDEDOR:</strong> BOVI PREMIUM, inscrita no CNPJ sob o nº 55.951.841/0001-76.</p>
    <p><strong>COMPRADOR:</strong> ${contractData.fullName}, residente na ${endCompleto}, CPF: ${contractData.cpf}.</p>
    <p>As partes têm entre si justo e acertado o presente Contrato, que se regerá pelas cláusulas seguintes:</p>

    <p style="font-weight:bold;margin-top:14px;">CLÁUSULA PRIMEIRA – DO OBJETO</p>
    <p>O presente contrato tem por objeto a venda dos seguintes produtos agropecuários:</p>
    <div style="margin-left:16px;">${produtosHTML}</div>
    <p><strong>Parágrafo Único:</strong> O COMPRADOR declara ter conhecimento das características dos produtos, renunciando a reclamações sobre vícios aparentes após o prazo da Cláusula Quinta.</p>

    <p style="font-weight:bold;margin-top:14px;">CLÁUSULA SEGUNDA – DO PREÇO E PAGAMENTO</p>
    <p>O valor total é de <strong>R$ ${fmtReal(contractData.valorTotal)}</strong> (${valorExtenso(contractData.valorTotal)}), podendo ser pago à vista ou parcelado mediante boleto, PIX ou cartão.</p>

    <p style="font-weight:bold;margin-top:14px;">CLÁUSULA TERCEIRA – RESERVA DE DOMÍNIO</p>
    <p>Nos termos dos arts. 521–528 do CC, a propriedade permanece com o VENDEDOR até quitação integral. O COMPRADOR assume posse direta como fiel depositário, respondendo por danos ou perdas.</p>

    <p style="font-weight:bold;margin-top:14px;">CLÁUSULA QUARTA – INADIMPLEMENTO E MORA</p>
    <p>O atraso no pagamento sujeita o COMPRADOR a: (i) correção pelo IGPM/IPCA; (ii) juros de 1% a.m.; (iii) multa de 2% a.d. sobre o saldo. Após 60 dias, o VENDEDOR poderá inscrever o COMPRADOR em cadastros de proteção ao crédito. Honorários advocatícios de 20% em caso de cobrança judicial (art. 389 CC).</p>

    <p style="font-weight:bold;margin-top:14px;">CLÁUSULA QUINTA – ENTREGA, ACEITAÇÃO E DEVOLUÇÃO</p>
    <p>O COMPRADOR terá <strong>7 dias corridos</strong> após o recebimento para vistoriar os produtos. A ausência de manifestação implica aceitação tácita. Devoluções por insatisfação (lacre intacto) terão frete por conta do COMPRADOR; por vício comprovado, pelo VENDEDOR.</p>

    <p style="font-weight:bold;margin-top:14px;">CLÁUSULA SEXTA – FORO</p>
    <p>Fica eleito o Foro da Comarca de <strong>Anápolis/GO</strong>, com renúncia a qualquer outro (art. 63 CPC).</p>

    <p style="margin-top:28px;">Local e data: <strong>${localSig}</strong>, ${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}.</p>

    <div style="margin-top:40px; text-align:center;">
        <p style="margin:0;">_______________________________</p>
        <p style="margin:4px 0 0;"><strong>COMPRADOR</strong></p>
        <p style="margin:2px 0;">${contractData.fullName}</p>
        <p style="margin:2px 0;">CPF: ${contractData.cpf}</p>
    </div>
</div>`;

    document.getElementById('contractContent').innerHTML = content;
}

// ─── GERAÇÃO DO PDF (contrato + assinatura) ──────────────────────────────────

async function generateAndSendPDF() {
    try {
        showFacialStatus('📄 Gerando PDF...', 'loading');

        const { jsPDF } = window.jspdf;

        // 1. Clonar contrato em div visível fora da tela
        //    html2canvas captura em branco quando o elemento está dentro de .step oculto
        const source = document.getElementById('contractContent');
        const clone = source.cloneNode(true);
        clone.style.cssText = 'position:fixed;top:0;left:-9999px;width:750px;background:#fff;padding:30px;font-family:Georgia,serif;font-size:12px;line-height:1.7;color:#222;';
        document.body.appendChild(clone);

        let contractCanvas;
        try {
            contractCanvas = await html2canvas(clone, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 750,
                windowWidth: 800
            });
        } finally {
            document.body.removeChild(clone);
        }

        const PDF_W = 210; // A4 largura em mm
        const PDF_H = 297; // A4 altura em mm
        const MARGIN = 10; // margem lateral mm
        const CONTENT_W = PDF_W - MARGIN * 2;

        // Calcular altura proporcional da imagem em mm
        const imgH = Math.round((contractCanvas.height * CONTENT_W) / contractCanvas.width);
        const contractImg = contractCanvas.toDataURL('image/jpeg', 0.92);

        const pdf = new jsPDF('p', 'mm', 'a4', { compress: true });

        // Paginação manual: fatiar a imagem por páginas
        const totalPages = Math.ceil(imgH / PDF_H);
        for (let i = 0; i < totalPages; i++) {
            if (i > 0) pdf.addPage();
            // Offset negativo para "rolar" a imagem
            const yOffset = -(i * PDF_H);
            // Garantir que todos os valores são números finitos válidos
            const safeX = parseFloat(MARGIN.toFixed(4));
            const safeY = parseFloat(yOffset.toFixed(4));
            const safeW = parseFloat(CONTENT_W.toFixed(4));
            const safeH = parseFloat(imgH.toFixed(4));
            pdf.addImage(contractImg, 'JPEG', safeX, safeY, safeW, safeH);
        }

        // Página de assinatura
        pdf.addPage();

        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(40, 40, 40);
        pdf.text('ASSINATURA DIGITAL DO COMPRADOR', 105, 20, { align: 'center' });

        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Assinatura manuscrita capturada digitalmente', 105, 28, { align: 'center' });

        // ✅ FIX: Garantir que o canvas de assinatura tem dimensões válidas
        const sigW = signatureCanvas.width;
        const sigH = signatureCanvas.height;

        if (sigW > 0 && sigH > 0) {
            const sigCanvas = document.createElement('canvas');
            sigCanvas.width = 560;
            sigCanvas.height = 180;
            const sigCtx = sigCanvas.getContext('2d');
            sigCtx.fillStyle = '#ffffff';
            sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
            sigCtx.drawImage(signatureCanvas, 0, 0, sigW, sigH, 0, 0, sigCanvas.width, sigCanvas.height);
            const sigImg = sigCanvas.toDataURL('image/png');

            // Dimensões fixas em mm, sem decimais problemáticos
            pdf.addImage(sigImg, 'PNG', 30, 40, 150, 48);
        }

        // Linha separadora
        pdf.setDrawColor(180, 180, 180);
        pdf.line(30, 95, 180, 95);

        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(40, 40, 40);
        pdf.text(contractData.fullName, 105, 103, { align: 'center' });

        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('CPF: ' + contractData.cpf, 105, 110, { align: 'center' });
        pdf.text('Data: ' + contractData.date, 105, 117, { align: 'center' });

        const pdfBlob = pdf.output('blob');
        console.log('✅ PDF gerado:', pdfBlob.size, 'bytes');

        await sendToGoogleDrive(pdfBlob);

    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        showFacialStatus('❌ Erro ao gerar PDF: ' + error.message, 'error');
        document.getElementById('captureBtn').disabled = false;
    }
}

// ─── ENVIO PARA O GOOGLE DRIVE ───────────────────────────────────────────────

async function sendToGoogleDrive(pdfBlob) {
    try {
        showFacialStatus('📤 Enviando para o servidor...', 'loading');

        const pdfBase64 = await blobToBase64(pdfBlob);

        let facialBase64 = null;
        if (facialImageData) {
            facialBase64 = facialImageData.split(',')[1];
        }

        const payload = {
            clientName: contractData.fullName,
            clientCPF: contractData.cpf,
            notaFiscal: contractData.numeroNF,
            pdfBase64: pdfBase64,
            facialImageBase64: facialBase64,
            latitude: userLocation?.latitude || null,
            longitude: userLocation?.longitude || null,
            accuracy: userLocation?.accuracy || null,
            mapLink: userLocation?.mapLink || null,
            timestamp: new Date().toISOString()
        };

        console.log('📡 Enviando payload:', JSON.stringify(payload).length, 'bytes');

        const response = await AuthManager.requisicaoSegura(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        let result;
        try { result = JSON.parse(text); }
        catch (e) { throw new Error('Resposta inválida: ' + text.substring(0, 100)); }

        if (result.status === 'success') {
            console.log('🎉 Sucesso!', result);
            showFacialStatus('✅ Enviado com sucesso!', 'success');

            setTimeout(() => {
                document.getElementById('successDetails').innerHTML =
                    `<strong>Cliente:</strong> ${contractData.fullName}<br>` +
                    `<strong>CPF:</strong> ${contractData.cpf}<br>` +
                    `<strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}`;
                showSuccess();
            }, 1000);
        } else {
            throw new Error(result.message || 'Erro desconhecido');
        }

    } catch (error) {
        console.error('❌ Erro no envio:', error);
        showFacialStatus('❌ Erro ao enviar: ' + error.message, 'error');
        document.getElementById('captureBtn').disabled = false;
    }
}

function blobToBase64(blob) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

function resetForm() {
    location.reload();
}