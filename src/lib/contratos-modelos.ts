// Modelos y cláusulas jurídicas para contratos, pagarés y cartas de instrucciones en Colombia
// Conforme a: Ley 527 de 1999, Decreto 2364 de 2012, Código de Comercio (Arts. 622 y 709),
// Ley 1581 de 2012 (Habeas Data) y Ley 1266 de 2008 (Centrales de Riesgo).

export const CLAUSULA_GARANTIA_PAGARE = `
<div style="margin-top: 1.5rem; margin-bottom: 1.5rem;">
  <h3 style="font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem; font-size: 13px;">
    CLÁUSULA DE GARANTÍA MEDIANTE TÍTULO VALOR:
  </h3>
  <p style="text-align: justify; line-height: 1.6;">
    Como garantía del cumplimiento cabal y oportuno de todas y cada una de las obligaciones dinerarias derivadas del presente contrato de promesa de compraventa (precio pactado, cuotas de financiación, saldos insolutos, intereses corrientes y de mora), <strong>EL PROMITENTE COMPRADOR</strong> suscribe en esta misma fecha y de manera coetánea e individual un <strong>PAGARÉ EN BLANCO A LA ORDEN</strong> junto con su respectiva <strong>CARTA DE INSTRUCCIONES</strong> conforme a lo dispuesto en el artículo 622 del Código de Comercio colombiano, autorizando de manera expresa e irrevocable a <strong>EL PROMITENTE VENDEDOR</strong> para diligenciar los espacios en blanco del mencionado título valor en los términos, condiciones y eventos pactados en caso de mora o incumplimiento de las obligaciones aquí contraídas.
  </p>
</div>
`;

export const CLAUSULA_HABEAS_DATA_Y_CENTRALES = (empresaNombre: string, empresaNit: string) => `
<div style="margin-top: 1.5rem; margin-bottom: 1.5rem;">
  <h3 style="font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem; font-size: 13px;">
    CLÁUSULA: TRATAMIENTO DE DATOS PERSONALES Y AUTORIZACIÓN PARA CONSULTA Y REPORTE A CENTRALES DE RIESGO:
  </h3>
  <div style="text-align: justify; line-height: 1.6;">
    <p style="margin-bottom: 0.75rem;">
      <strong>1. Tratamiento de Datos Personales (Ley 1581 de 2012):</strong> EL PROMITENTE COMPRADOR autoriza de manera previa, libre, expresa, informada e inequívoca a <strong>${empresaNombre || 'INVERSIONES INGENIERIA GC S.A.S'}</strong>, identificada con NIT <strong>${empresaNit || '900.769.975-1'}</strong>, en calidad de Responsable del Tratamiento, para recolectar, almacenar, compilar, usar, circular, actualizar y suprimir sus datos personales con las finalidades de: formalizar y ejecutar el presente contrato de compraventa, gestionar la cartera, cobranza judicial y prejudicial, facturación, envío de notificaciones contractuales y legales, y atención de requerimientos judiciales y administrativos, conforme a la Política de Tratamiento de Información de la compañía.
    </p>
    <p style="margin-bottom: 0.75rem;">
      <strong>2. Consulta y Reporte a Centrales de Riesgo (Ley 1266 de 2008 y Ley 2157 de 2021):</strong> EL PROMITENTE COMPRADOR autoriza de manera expresa, previa e irrevocable a <strong>${empresaNombre || 'INVERSIONES INGENIERIA GC S.A.S'}</strong>, o a quien en el futuro represente sus derechos o detente la calidad de acreedor o tenedor legítimo, para consultar, procesar, solicitar, verificar, reportar y divulgar ante los operadores de bancos de datos de información financiera, crediticia, comercial y de servicios (tales como Datacrédito - Experian, CIFIN - TransUnion u otros legalmente autorizados), toda la información relativa al nacimiento, desarrollo, cumplimiento, modificación, extinción o incumplimiento de las obligaciones crediticias y dinerarias derivadas de este contrato y del pagaré otorgado en garantía. Esta autorización faculta expresamente a la entidad acreedora a efectuar el reporte negativo correspondiente ante dichas centrales, previo cumplimiento de la notificación o comunicación previa exigida por el artículo 12 de la Ley 1266 de 2008 modificado por la Ley 2157 de 2021.
    </p>
    <p style="margin-top: 0.75rem; background-color: #f1f5f9; padding: 8px 12px; border-left: 3px solid #2563eb; font-size: 11px; color: #334155;">
      <strong>Disponibilidad de la Política de Privacidad:</strong> El titular de los datos declara que previo a la suscripción del presente documento tuvo acceso y conoció íntegramente la <a href="/politica-datos" target="_blank" rel="noopener noreferrer" style="color: #2563eb; font-weight: bold; text-decoration: underline;">Política de Tratamiento y Protección de Datos Personales</a> disponible en línea en <a href="/politica-datos" target="_blank" rel="noopener noreferrer" style="color: #2563eb; font-weight: bold; text-decoration: underline;">/politica-datos</a>, y que podrá ejercer sus derechos de Habeas Data (conocer, actualizar, rectificar y suprimir) a través del canal oficial: <strong>juridicoinversionesing@gmail.com</strong>.
    </p>
  </div>
</div>
`;

export interface GenerarPagareParams {
  empresaNombre: string;
  empresaNit: string;
  deudoresTexto: string;
  inmuebleIdentificador: string;
  proyectoNombre: string;
  contractRef: string;
  fechaCiudad?: string;
}

export function generarTextoPagareEnBlanco({
  empresaNombre,
  empresaNit,
  deudoresTexto,
  inmuebleIdentificador,
  contractRef,
  fechaCiudad = "Villavicencio, Meta"
}: GenerarPagareParams): string {
  return `
<div class="pagare-container" style="font-family: serif; color: #111; line-height: 1.6;">
  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px;">
    <h2 style="font-size: 18px; font-weight: bold; letter-spacing: 1px; margin: 0; text-transform: uppercase;">
      PAGARÉ EN BLANCO A LA ORDEN
    </h2>
    <p style="font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; color: #444;">
      TÍTULO VALOR REGIDO POR EL ARTÍCULO 709 Y CONCORDANTES DEL CÓDIGO DE COMERCIO
    </p>
  </div>

  <div style="background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 4px; padding: 12px; margin-bottom: 20px; font-size: 12px; font-family: sans-serif;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div>
        <p style="margin: 2px 0;"><strong>PAGARÉ No.:</strong> PAG-${contractRef}</p>
        <p style="margin: 2px 0;"><strong>LUGAR DE CUMPLIMIENTO:</strong> ${fechaCiudad}</p>
        <p style="margin: 2px 0;"><strong>VALOR DEL CAPITAL:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border: 1px dashed #9ca3af; font-weight: bold;">$[ ESPACIO EN BLANCO ]</span></p>
      </div>
      <div>
        <p style="margin: 2px 0;"><strong>ACREEDOR / TENEDOR:</strong> ${empresaNombre || 'INVERSIONES INGENIERIA GC S.A.S'}</p>
        <p style="margin: 2px 0;"><strong>NIT ACREEDOR:</strong> ${empresaNit || '900.769.975-1'}</p>
        <p style="margin: 2px 0;"><strong>FECHA DE VENCIMIENTO:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border: 1px dashed #9ca3af; font-weight: bold;">[ ESPACIO EN BLANCO ]</span></p>
      </div>
    </div>
    <div style="margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 6px;">
      <p style="margin: 2px 0;"><strong>OTORGANTE(S) / DEUDOR(ES):</strong> ${deudoresTexto}</p>
      <p style="margin: 2px 0;"><strong>CONTRATO VINCULADO:</strong> Promesa de Compraventa Ref. ${contractRef} - Inmueble ${inmuebleIdentificador}</p>
    </div>
  </div>

  <div style="font-size: 13px; text-align: justify;">
    <p style="margin-bottom: 12px;">
      <strong>PROMESA INCONDICIONAL DE PAGO:</strong> Nosotros, los abajo firmantes en calidad de <strong>OTORGANTE(S) Y DEUDOR(ES)</strong>, de manera expresa, libre y voluntaria, declaramos por medio del presente instrumento que prometemos pagar incondicionalmente a la orden de <strong>${empresaNombre || 'INVERSIONES INGENIERIA GC S.A.S'}</strong>, identificada con NIT <strong>${empresaNit || '900.769.975-1'}</strong>, o a quien represente sus derechos o a su legítimo tenedor o endosatario, en sus oficinas de la ciudad de ${fechaCiudad}, la suma líquida, exigible y en dinero efectivo que resulte de liquidar las obligaciones pendientes y que sea incorporada en el espacio en blanco del presente título valor, conforme a las instrucciones conferidas en la Carta de Instrucciones que suscribe y acompaña este pagaré.
    </p>

    <p style="margin-bottom: 12px;">
      <strong>INTERESES:</strong> Durante el plazo convenido se causarán los intereses a las tasas ordinarias acordadas en el contrato base. En caso de mora en el pago de la totalidad o de cualquiera de las cuotas o del saldo del capital, el importe adeudado devengará intereses moratorios a la tasa máxima legal permitida y certificada por la Superintendencia Financiera de Colombia para el período correspondiente, liquidables desde el primer día de mora hasta cuando se verifique el pago total de la obligación.
    </p>

    <p style="margin-bottom: 12px;">
      <strong>CLÁUSULA ACELERATORIA:</strong> El tenedor legítimo del presente pagaré queda facultado para declarar de plazo vencido la totalidad de la obligación y exigir de inmediato el pago judicial o extrajudicial del saldo insoluto de capital, los intereses corrientes y moratorios causados, y demás sumas adeudadas, sin necesidad de requerimiento judicial ni privado alguno para constituir en mora, a los cuales renunciamos expresamente, si se incurre en mora en el pago de una o más cuotas del plan de amortización del contrato vinculado.
    </p>

    <p style="margin-bottom: 12px;">
      <strong>GASTOS DE COBRANZA Y HONORARIOS:</strong> En caso de cobro judicial o prejudicial de este pagaré, serán de nuestro cargo exclusivo todos los gastos, costos, pólizas, costas procesales y honorarios de abogado que se originen por motivo del cobro de la deuda.
    </p>

    <p style="margin-bottom: 12px;">
      <strong>RENUNCIA A PRESENTACIÓN Y PROTESTO:</strong> El(los) deudor(es) y co-deudor(es) renunciamos expresamente a la presentación para el pago, al aviso de rechazo o de no pago y al protesto del presente título valor, de conformidad con lo establecido en el Código de Comercio.
    </p>

    <p style="margin-bottom: 12px; font-style: italic; background-color: #fefce8; padding: 8px; border: 1px solid #fef08a; border-radius: 4px; font-size: 12px;">
      <strong>ESPACIOS EN BLANCO:</strong> Se hace constar de manera fehaciente que este título valor se firma con espacios en blanco (monto del capital exigible y fecha de vencimiento) y que se autoriza su diligenciamiento con sujeción irrestricta a la Carta de Instrucciones anexa, suscrita simultáneamente de conformidad con el artículo 622 del Código de Comercio colombiano.
    </p>
  </div>
</div>
`;
}

export function generarTextoCartaInstrucciones({
  empresaNombre,
  empresaNit,
  deudoresTexto,
  inmuebleIdentificador,
  contractRef,
  fechaCiudad = "Villavicencio, Meta"
}: GenerarPagareParams): string {
  return `
<div class="carta-instrucciones-container" style="font-family: serif; color: #111; line-height: 1.6;">
  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px;">
    <h2 style="font-size: 18px; font-weight: bold; letter-spacing: 1px; margin: 0; text-transform: uppercase;">
      CARTA DE INSTRUCCIONES PARA EL DILIGENCIAMIENTO DE PAGARÉ EN BLANCO
    </h2>
    <p style="font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; color: #444;">
      MANDATO LEGAL IRREVOCABLE OTORGADO CONFORME AL ARTÍCULO 622 DEL CÓDIGO DE COMERCIO
    </p>
  </div>

  <div style="font-size: 13px; text-align: justify;">
    <p style="margin-bottom: 12px;">
      <strong>Ciudad y Fecha:</strong> ${fechaCiudad}, a la fecha de firma digital del presente documento.<br />
      <strong>Señores:</strong> <strong>${empresaNombre || 'INVERSIONES INGENIERIA GC S.A.S'}</strong><br />
      <strong>NIT:</strong> ${empresaNit || '900.769.975-1'}<br />
      <strong>Referencia:</strong> Instrucciones para diligenciamiento del Pagaré No. PAG-${contractRef} (Inmueble: ${inmuebleIdentificador})
    </p>

    <p style="margin-bottom: 12px;">
      Nosotros, ${deudoresTexto}, obrando en nombre propio y en calidad de <strong>OTORGANTE(S) Y DEUDOR(ES)</strong> del pagaré de la referencia suscrito a su favor en la presente fecha con espacios en blanco, por medio del presente escrito manifestamos a ustedes de manera <strong>PERMANENTE, EXPRESA E IRREVOCABLE</strong> que los facultamos para que, sin previo aviso ni requerimiento judicial o extrajudicial, procedan a llenar los espacios en blanco dejados en el citado Pagaré, con arreglo estricto a las siguientes instrucciones:
    </p>

    <div style="padding-left: 12px; margin-bottom: 12px;">
      <p style="margin-bottom: 8px;">
        <strong>PRIMERA. EVENTO DE EXIGIBILIDAD Y LLENADO:</strong> El Pagaré podrá ser diligenciado por el tenedor legítimo cuando el (los) deudor(es) incurra(n) en mora total o parcial en el pago de una (1) o más de las cuotas o saldos convenidos en el contrato de promesa de compraventa vinculado, o cuando se configure cualquiera de las causales de terminación o aceleración pactadas.
      </p>

      <p style="margin-bottom: 8px;">
        <strong>SEGUNDA. IMPORTE O VALOR DEL CAPITAL A INSERTAR:</strong> En el espacio reservado para la suma líquida de capital a pagar, se colocará exactamente el valor del saldo insoluto de capital adeudado a la fecha de diligenciamiento del pagaré, según los libros de contabilidad o registros de cartera de la empresa acreedora, más las cuotas ordinarias o extraordinarias vencidas no canceladas.
      </p>

      <p style="margin-bottom: 8px;">
        <strong>TERCERA. FECHA DE VENCIMIENTO:</strong> En el espacio reservado para la fecha de vencimiento, se insertará la fecha correspondiente al día en que se efectúe el diligenciamiento del título valor para su cobro judicial o extrajudicial.
      </p>

      <p style="margin-bottom: 8px;">
        <strong>CUARTA. LIQUIDACIÓN DE INTERESES:</strong> Los intereses de mora se liquidarán a la tasa máxima legal certificada por la Superintendencia Financiera de Colombia para el período de mora correspondiente, computados desde la fecha en que se incurrió en mora en el contrato base hasta la fecha de pago efectivo.
      </p>

      <p style="margin-bottom: 8px;">
        <strong>QUINTA. MÉRITO EJECUTIVO:</strong> Reconocemos expresamente que una vez diligenciado el pagaré con sujeción a las presentes instrucciones, el título valor prestará mérito ejecutivo pleno ante la jurisdicción ordinaria civil, sin necesidad de notificación o requerimiento previo para constituir en mora.
      </p>
    </div>

    <p style="margin-bottom: 12px; background-color: #f9fafb; padding: 10px; border-left: 4px solid #2563eb; font-size: 12px;">
      Para constancia y validez probatoria conforme a la Ley 527 de 1999 y Decreto 2364 de 2012, firmamos la presente Carta de Instrucciones mediante firma electrónica/digital con sellado de tiempo y log de auditoría.
    </p>
  </div>
</div>
`;
}
