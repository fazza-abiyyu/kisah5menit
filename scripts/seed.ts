import { saveStory } from "../src/lib/storage";
import { Story } from "../src/types";

const dummyStory: Story = {
    id: "dummy-001",
    slug: "hujan-di-senja-jakarta",
    title: "Hujan di Senja Jakarta",
    genre: "slice of life",
    theme: "Kenangan yang muncul saat hujan turun.",
    tone: "melankolis lembut",
    language: "id-mixed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "published",
    tags: ["hujan", "jakarta", "kenangan", "kopi"],
    content: {
        format: "markdown",
        body: `
Hujan turun lagi di Jakarta sore ini. Bukan hujan badai yang menakutkan, tapi hujan rintik yang awet, seolah langit sedang menangis pelan karena patah hati.

Aku duduk di sudut *coffee shop* langganan, menatap jalanan yang mulai macet. Aroma *roasted beans* menguar kuat, bercampur dengan bau tanah basah—petrichor yang selalu berhasil memanggil memori lama.

"Satu *hot latte*, Mas," suara barista membuyarkan lamunanku.

"Xie xie (terima kasih)," jawabku refleks. Barista itu tersenyum tipis.

Di meja seberang, sepasang muda-mudi sedang tertawa lepas. Si perempuan menunjuk-nunjuk layar ponselnya, sementara si lelaki menatapnya dengan tatapan yang... ah, aku kenal tatapan itu. Tatapan yang dulu sering kau berikan padaku setiap kali aku bercerita antusias tentang hal-hal remeh.

Hujan di luar semakin deras. Kaca jendela mulai mengembun. Aku menghela napas panjang, mencoba mengusir sesak yang tiba-tiba mampir. Jakarta memang selalu punya cara untuk membuat kita merasa sepi di tengah keramaian, kan?

Tapi sore ini, aku memutuskan untuk tidak larut. Aku menyeruput latte-ku yang mulai hangat kuku. Pahit, tapi ada *aftertaste* manis yang tertinggal. Persis seperti kenangan tentangmu.

Mungkin, hujan tidak turun untuk membuat kita sedih. Mungkin, dia turun hanya untuk menyiram debu-debu masa lalu, biar besok pagi, udara jadi lebih bersih untuk kita bernapas lagi.

Aku tersenyum sendiri. *Life goes on*, pikirku. Dan hujan pun perlahan reda.
    `
    },
    cover: {
        prompt: "A cozy coffee shop in Jakarta during rain, view from inside looking out the window, melancholic mood, lo-fi aesthetic",
        style: "anime illustration",
        aspect_ratio: "4:5",
        image_url: "https://via.placeholder.com/400x500?text=Rainy+Jakarta"
    },
    meta: {
        plan_summary: "Dummy story for testing.",
        target_emotion: "calm",
        reading_time_minutes: 2,
        keywords: ["dummy", "test"]
    }
};

console.log("Seeding dummy story...");
saveStory(dummyStory);
console.log("Done.");
