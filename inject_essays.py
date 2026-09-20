import json
import sys
sys.path.append("c:/Users/davif/Desktop/redação/reda-o-nota-mil")
from generate_themes import get_theme_data

data = get_theme_data()

for i, theme in enumerate(data):
    theme["essays"] = [
        {
            "title": f"Os desafios de: {theme['topic']}",
            "author": f"Estudante Exemplar · Redação Modelo {i+1}A",
            "intro": f"Na obra 'Cidadão de Papel', Gilberto Dimenstein denuncia a distância entre os direitos garantidos na teoria e sua efetivação na prática. Sob essa ótica, quando se observa {theme['topic'].lower()}, nota-se um cenário em que a cidadania ainda não se concretiza plenamente.",
            "text": [
                f"Na obra 'Cidadão de Papel', Gilberto Dimenstein denuncia a distância entre os direitos garantidos na teoria e sua efetivação na prática. Sob essa ótica, quando se observa {theme['topic'].lower()}, nota-se um cenário em que a cidadania ainda não se concretiza plenamente. Diante disso, é fundamental analisar as raízes históricas e a negligência governamental que perpetuam esse impasse.",
                f"Em primeiro plano, a naturalização de condutas omissivas dificulta a resolução do problema. A falta de debates abertos nas escolas e na mídia faz com que a sociedade trate a questão como um tabu. Além disso, a fragilidade da rede de apoio estatal amplia a vulnerabilidade dos cidadãos envolvidos, deixando-os à margem das políticas públicas que deveriam protegê-los.",
                f"Portanto, medidas são necessárias para alterar esse quadro. Cabe ao Governo Federal, por meio dos Ministérios competentes, promover políticas preventivas estruturadas e direcionar investimentos massivos para infraestrutura de acolhimento. Essa ação deve ser acompanhada de campanhas permanentes na mídia, a fim de conscientizar a população, romper esse ciclo de descaso e, finalmente, garantir a cidadania plena idealizada por Dimenstein."
            ]
        },
        {
            "title": f"Perspectivas sobre {theme['topic']}",
            "author": f"Aprovado Med · Redação Modelo {i+1}B",
            "intro": f"A Constituição Federal de 1988 assegura direitos fundamentais a todos os brasileiros. Contudo, ao analisar {theme['topic'].lower()}, percebe-se uma lacuna evidente entre a teoria constitucional e a realidade social.",
            "text": [
                f"A Constituição Federal de 1988 assegura direitos fundamentais a todos os brasileiros. Contudo, ao analisar {theme['topic'].lower()}, percebe-se uma lacuna evidente entre a teoria constitucional e a realidade social. Essa conjuntura é motivada não só pela ineficiência estatal, mas também pela apatia coletiva.",
                f"De um lado, a inoperância do Estado agrava o panorama. A ausência de fiscalização rigorosa e a má distribuição de recursos impedem que soluções de longo prazo sejam implementadas. De outro lado, a sociedade, imersa no individualismo característico da modernidade líquida de Zygmunt Bauman, tende a invisibilizar o sofrimento alheio.",
                f"Dessa forma, é urgente que o Estado interfira. É dever das instâncias governamentais criar e fortalecer programas de amparo, utilizando verbas públicas para capacitar profissionais e garantir o atendimento adequado. Somado a isso, as escolas devem incluir a temática em seus currículos, promovendo a empatia e a ação cidadã desde a base educacional."
            ]
        },
        {
            "title": f"Caminhos para superar: {theme['topic']}",
            "author": f"Aluno Focado · Redação Modelo {i+1}C",
            "intro": f"Historicamente, o Brasil enfrenta dificuldades na consolidação de uma sociedade justa e igualitária. No que tange a {theme['topic'].lower()}, a negligência das autoridades agrava um problema que já se enraizou na cultura nacional.",
            "text": [
                f"Historicamente, o Brasil enfrenta dificuldades na consolidação de uma sociedade justa e igualitária. No que tange a {theme['topic'].lower()}, a negligência das autoridades agrava um problema que já se enraizou na cultura nacional, exigindo ações imediatas para a sua mitigação.",
                f"A princípio, o silenciamento midiático contribui para a desinformação. Questões relevantes como essa são frequentemente negligenciadas nos veículos de massa, o que impede a mobilização popular. Ademais, a ausência de políticas afirmativas contínuas reforça a exclusão de grupos já marginalizados.",
                f"Logo, urge que as lideranças políticas tomem providências. É necessário que o Poder Legislativo crie leis mais rígidas e que o Executivo garanta a sua aplicação, alocando recursos para monitoramento constante. Ademais, a mídia deve promover campanhas de conscientização em horário nobre, visando engajar a população e reverter esse quadro excludente."
            ]
        }
    ]

out = "export const dailyThemes = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n"
with open("c:/Users/davif/Desktop/redação/reda-o-nota-mil/src/data/themes.ts", "w", encoding="utf-8") as f:
    f.write(out)
