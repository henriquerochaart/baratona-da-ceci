/* Pré-lista de bares (fotos do Google Maps) e utilitários. */
const G = "https://lh3.googleusercontent.com/grass-cs/";
const F = (k, s = "=s4800-w800-h600") => G + k + s;
// Ponto de encontro: o Tantin. Fica fixo no topo da lista, sem setinhas e fora do ranking.
const ENCONTRO_ID = "tantin";
const BARES = [
  ["tantin", "Tantin", "R. dos Pinheiros, 987", -23.5675688, -46.6871967, F("AABkmLeV-CBGoETeSTQKgJDrL3SwoCWY0FUzpOhpwOuxtSK8Hr7NhwDbV84-Sgd9Xfu62pEqdRlpFxT-YtUggAT8RcNU2VlNGBRPxLMO1JH-i_2EMah_2JwQN65heg051OIwRJ7Uth108XlloNM")],
  ["colchetes", "Colchetes", "R. Mateus Grou, 162", -23.5645205, -46.6840381, F("AABkmLcuuN1fKkUrWzY2blw5rwiaEA1__8I5uVS6Ns3ONkq7j89yXAPTjN7rf4FCWwxGmq-mGd1jTS5iDruYK0IJ7vXNBkqnFOgoeoYP8rRStywpgXhVwa3E2oPnKxZRLkVJz2dAmxmkOg")],
  ["ohmadalena", "Oh! Madalena", "R. Horácio Lane, 207", -23.558783, -46.6872521, F("AABkmLfZ_ENffC4gwqJ4j3QNvMXB50Jx3jLXeb9SncrGE4W5EwBx_DkJJO3Eu2AYBUaiDkeZ3NFC1iEt_5M_n7sctlZym4-ku8iial1IpJkB5cw9vOS5UF6o-yspx0JM7UrTgX1AYew")],
  ["rainha", "Rainha da Vila Madalena", "R. Fradique Coutinho, 1070", -23.557987, -46.6899104, F("AABkmLfV8Y_Vb1WTlXdX2hZbmrb0MC3P1mT_5VnM-9nbSKtxXaVgRXeR55Cdor_D9d-C5pquTS1X0m1KLcD_qxPt5GM1lNfU03fXiEsCUaTdSmSigZojC_VoRg8P5aoCod5Qfgw2ZpJU")],
  ["butiquim", "Butiquim da Cidade", "R. Fradique Coutinho, 1127", -23.5577306, -46.6904879, F("AABkmLecdEoOFaiAw339rYn_EX5yE-DPjYmt6wMFTgdeba_tXn61QKYIavixD3NkUxDE6gHsksXT36TeiaEkPWx4krW5ob6XSxcp5lyj7RJ8LK0YUJ8Nb86PAdeg2fwpOK9bL-ReQUk")],
  ["pasquim", "O Pasquim", "R. Aspicuelta, 524", -23.5579319, -46.6903496, F("AABkmLfaV7ZwwVBCGZJdJ-GVyzRHdpzuCtPvIZUFJKQkOrjQ4zz7mqU-I3wszOU2GbL6QskAsBvQfGI2X7nWWmtYqXi7R5VWY6nmvTawLgTcLo1vz_zlw-z_60j9CtTNILMuVPytA6zH")],
  ["piola", "Armazém Piola", "R. Aspicuelta, 547", -23.5583151, -46.6903171, F("AABkmLd59l1LPYWo-GDkmzXrRo4-9oF7aQ5plwg_X0F-GV7Uv9GNjfFsHi-ep_d_pmsaWMmyXjP-6735QVHF9vaXR1AmowQI-ODC1wpRUA5L8996SXUxoCxTV6DOvgYlZcaumpyDFh11etwoxK6L")],
  ["todosossantos", "Boteco Todos os Santos", "R. Aspicuelta, 585", -23.5585312, -46.6906309, F("AABkmLe1AP3kmu0tr4YjiRG-eQKUPsh6ZP0hCjy8vZW7bIe3bSVsUMZNc_qxijxiaz9XH1TmfmUiHXpywzmJy4tOaj7Kmxv1HoRM0S-hDgLF7BB5-7SGGXcJxq1sLtumAHNfmRiN-lsu")],
  ["quintal", "Quintal do Espeto", "R. Mourato Coelho, 1022", -23.5588569, -46.6906294, F("AABkmLclG5k2a-VqXfYxok0BN1P-iY7HiEzn0qJQy9eu5DOxuQWUDXQt9aGyZrSeFHvrheuTRhZna6B4arDbpYIUhP88MwZn0IYiUMWDrbfGR9ucUuwNwNa3gRAxAVpXvisi8S5qbefp")],
  ["saobento", "Boteco São Bento", "R. Mourato Coelho, 1060", -23.558607, -46.690845, F("AABkmLdRBmCX5zAsCNU_DToeePWWr1dakuOne6Q3iIhpRL-hnwx3qc8v4nU_sVadysFi6CDGHamoPIehmhprCae7s_PBiNYu9dmWqAZyksmwAjKg4g7llD9L_CV5e-v4VCYN6stkx4AMQceNRkU")],
  ["patriarca", "Patriarca", "R. Mourato Coelho, 1059", -23.5587469, -46.691148, F("AABkmLcjIjst8EmMxqhRdB8ovoNmtiXEerkjo0jTrvREjZNBFEjB_YFvmqucg1cNMDdMwpm7R3rIuchLTDNgOEWp73Bd4nuCmfnrip1QD4df67Pq5J_IatN2Y07rKOeXJx5_ZZjh66Bh-yxyp9hR")],
  ["disse", "Disse Que Me Disse", "R. Fidalga, 408", -23.5559827, -46.6900519, F("AABkmLc9i1-H2AYsF2QCaGL7yc8_PQiHmEenk_zJ2Y5PLq7TaZQmO31UwPEGzx4ypR_y4uSRZdMRz6Kob2vEEFcaUp7BRc6tkk8p9nE0Ds7f6vXqbbPVZSLVD7OkuQVWGNKHXcCoYqtl4z7G2YZw")],
  ["goela", "Goela", "R. Fidalga, 396", -23.5560406, -46.6899729, F("AABkmLdhIsGZYIjjcvUuoXRKd_4FOLVjIT2ZF3JTpqZ3bhg7cdvEdyZ3mJK5g-eDbUSoJOQd_db4Fksa2dBx2DWwLommBHFRoDuNPI6p4yFrxQ6sQ21oajU3E613pFMk-x_XR6tqOWDu")],
  ["croma", "Croma Beer Co.", "R. Harmonia, 472", -23.5539546, -46.6885875, F("AABkmLdBEgY_umTKLGQ00ohAwfLGRvRDfx6qu7ZTQ7ARSyaBsnVTVgpwXkosNg26OPlewpTx88ghkPq1sGk5Kc1vyxu0QNU8kyUN1aq8pWk-qJkkSLVXRMliZBKj1rqpIbf9URDFDPZt")],
  ["backyard", "Backyard", "R. Harmonia, 255", -23.5558235, -46.6878459, F("AABkmLeK1jrey2A4dnlZOlV29CEDf2To4_IhMvMswkEUBVSZlzLLyyAywITJD74G4rtPcNs5KdJXCv71kVrehNKEbSUN7lCjw4v1RmzHPoNiUnszK2MW5b5A2Rv81KE9AJeYSsY9Iyl6")],
  ["pracinha", "Pracinha do Seu Justino", "R. Harmonia, 117", -23.556885, -46.687129, F("AABkmLcwCtDLispG5g6PwGHdfGC6F2TDKbcOM3cUBlK8Bae6hMTrozGTOTclZP_Fe08zFnG7NfW1BFuDNe-eZY-OBszW4knVnNtvt5msnHuJHkR5WLkneKAUM4QpFrmunxMf6Dcfhp7Bbw")],
  ["quitandinha", "Quitandinha", "R. Fidalga, 242", -23.5572453, -46.6891327, F("AABkmLcxy9ffhAA8XptpjIpVpp5aeehzb-GNe3iQ6F9-f3LUAeMkybVg0MempK873plDFLLbjJF-AySCE02gcXcsRMXf7N3rnTNISn7Vmujf5MsvE1nGW6wTopc7Ec2F4x62VWf9r0pH")],
  ["banqueta", "Banqueta", "R. Aspicuelta, 202", -23.5562513, -46.687795, F("AABkmLeiZ3VRnkBPI87FMFm5LrGLq7_4GZ_y-QZZy0_4TskKwnrfnvcDUVdD1xU10eediaTqaTbq5Xpbl0x0ls4PXoL5VrYE8x-fQIBJjv6Q2Ls8kvvwruynaPQaeI2AXmMYekUnYQ")],
  ["deprimeira", "De Primeira Botequim", "R. Aspicuelta, 271", -23.5568601, -46.6880805, F("AABkmLcf5CRRC-SCeTaaeJsNeu7SDPYgLNgzVxaI_q3grzJ0wzDPgDYd_udkPz5ECsc4tPAtbS4_-d-mccqJZpYMFVpB0xQ1ZrN0s4s6UBuvBEncLiz5Rjw7w0V3DxuodMP4FSJo77Gm4Q")],
  ["curtica", "Curtiça", "R. Inácio Pereira da Rocha, 87", -23.5590771, -46.6877763, F("AABkmLc5LV1ASKq67fDTh_kL6bDt5Xxk4FoauYDF8B-pwWwha193_Ff9TghRlZjFs0uY5CdA-EcmYe6yG1hYeGrd_H0lcybgbWzexxQOIRm7UoozHDAd2iVjl1UlGLsWIreOY9BWkuETKw1QEZgP")],
  ["torneira", "Torneira", "R. Inácio Pereira da Rocha, 121", -23.559373, -46.6880969, F("AABkmLdXrzQw6a3PtUTzWLNVDixKrjP389Y7Sh4tSDq2Vr8a2tbMTXEj9-WrPI9FqHcwPC2-BEM4kOaHemeGv7NdTYfykJM4J78_rbtWE2T1R8vZYR-Fa8ZV5iB5t5lFqdlOJUDpVs4j", "=s4800-w800-h576")],
  ["supra", "Supra Bar", "R. Mourato Coelho, 838", -23.5602844, -46.6897723, F("AABkmLcZn1O3k6VZazgUMrvyBvytJGcjX975xQDTJ_y-rJjiWpZU0eyOnYVYb1Fzft8BUkf2X1f7_frH0KlLLyYjpYcQB8u_0rwCQjX3VCY9pFdyQ6CNYIMcxn750X2gR6zsQB2CHmpI", "=s4800-w800-h539")],
  ["cardealpub", "Cardeal Pub", "R. Cardeal Arcoverde, 1899", -23.5623649, -46.6893834, F("AABkmLeOo6iEHWURiEiXcrqaXsD3bYyQlqjsAfcRHnIEtPc3FjhPH4-PBefML-4Lb7Fj-i4m5jCEDf9bq_JNeetuoAWyyPO9KLoIPlFyGKqPcat0B8U1S4hoJBr1aNP0INRHh9R5MEun7yZu99I")],
  ["moela", "Bar Moela", "R. Cardeal Arcoverde, 2320", -23.5645451, -46.692933, F("AABkmLdwk87_VfTbCAXxD5HggC_FASbUOGSdh7yPQ_GbxDFMYjJXa96HxNihukeDI7hD45MmT3o2djhLn5YpjxBQ5dWlphIESdkQHDRKmyEGooPnxtgBP_miuynew5snfMYnLpOsuVJ8")],
  ["pitico", "Pitico", "R. Guaicuí, 61", -23.5662379, -46.6960825, F("AABkmLdl2--fD8yO1v5AVOMFE4q84Y6MpeXVBd_r0mgh1GKdxXPFR-SQAwKynSos3OKhP4ZoHU6lnM-IdlvhUMvDGGwzUv1y60ACxOBNKnwnaVEIRPjwcnG5YDGJ4Ygf2Mvfj99Du2fuqh3mmGU")],
  ["arlete", "Arlete", "R. Vupabussu, 101", -23.5599636, -46.6974309, F("AABkmLfwvNACjJmdLQ8MjWsGyMHG-VhqoPxaRTABeyu3pZb27agz3Q5Oc6Y63r4qJ52iA57mXYCaf0q5N8Xu0aC0z6f1jWPzhxL5EzRkmzLOOUc6_x9fFpkdtj-HpjFUKlN1kX6b0tOj_w", "=s4800-w800-h595")],
  ["paramount", "Boteco Paramount", "R. dos Pinheiros, 1179", -23.5681896, -46.6890101, ""],
  ["seujustino", "Seu Justino", "R. Harmonia, 77", -23.5572069, -46.6870026, ""],
  ["gonzaga", "Bar do Gonzaga", "R. Cardeal Arcoverde, 2865", -23.5688889, -46.6949368, ""],
  ["caoveio", "Cão Véio", "R. Girassol, 396", -23.5552118, -46.6892262, ""],
  ["paroquia", "Bar Paróquia", "R. Wisard, 426", -23.5560145, -46.6910304, ""],
  ["bardobaixo", "Bar do Baixo", "R. Girassol", -23.557888, -46.687707, ""],
].map(([id, nome, end, lat, lon, foto]) => ({ id, nome, end, lat, lon, foto, sug: false }));
const ENCONTRO = BARES.find((b) => b.id === ENCONTRO_ID);


const norm = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const inicial = (n) => (norm(n)[0] || "?").toUpperCase();
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const mapsUrl = (b) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(b.nome + (b.end ? ", " + b.end : "") + ", São Paulo");
