import { version } from "../../package.json";
import type { BrowserStorage } from "../services/browserStorage";

export type ClassicAboutInformation = {
  storage: BrowserStorage | null | undefined;
  songs: number; albums: number; artists: number;
  photos: number; podcasts: number; texts: number;
  source: string;
};

export function aboutPage(key: string | null) {
  return key === "about-1" ? 1 : key === "about-2" ? 2 : 0;
}

const size = (bytes: number) => bytes >= 1024 ** 3
  ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
  : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

/** The shared identity/storage header and three Center-key cards follow the 2007 layout.
 * Web storage and application/library fields deliberately describe ReiPod's actual data. */
export function ClassicAboutScreen({ index, information: info }: {
  index: number; information: ClassicAboutInformation;
}) {
  const { storage } = info;
  const counts = [["歌曲", info.songs], ["本地照片", info.photos],
    ["专辑", info.albums], ["本地播客", info.podcasts],
    ["艺人", info.artists], ["文本", info.texts]];
  return <section className="classic-about" aria-label="关于本机" data-about-page={index}>
    <div className="about-identity">
      <span>{storage ? `${size(storage.usage)} 已用` : ""}</span>
      <strong>ReiPod</strong>
      <span>{storage ? `${size(storage.quota - storage.usage)} 可用` : ""}</span>
    </div>
    <div className="about-card">
      {index === 0 ? <div className="about-storage">
        {storage && <div className="about-storage-rail" role="meter" aria-label="网页存储用量"
          aria-valuemin={0} aria-valuemax={storage.quota} aria-valuenow={storage.usage}
          aria-valuetext={`${size(storage.usage)} 已用，${size(storage.quota - storage.usage)} 可用`}>
          <i style={{ width: `${storage.usage / storage.quota * 100}%` }} />
        </div>}
        <span>{storage === undefined ? "正在读取存储信息" : storage ? "网页存储" : "存储信息不可用"}</span>
      </div> : index === 1 ? <dl className="about-counts">
        {counts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl> : <dl className="about-version">
        <div><dt>软件版本</dt><dd>{version}</dd></div>
        <div><dt>机型</dt><dd>iPod classic</dd></div>
        <div><dt>音乐来源</dt><dd>{info.source}</dd></div>
      </dl>}
    </div>
    <div className="about-pages" role="img" aria-label={`第 ${index + 1} 页，共 3 页`}>
      {[0, 1, 2].map(value => <i key={value} data-current={index === value} />)}
    </div>
  </section>;
}
