import { TFile, TFolder } from 'obsidian';
import MyPlugin from '../main';

// WordCounter类，用于统计字数
export class WordCounter {
    plugin: MyPlugin;

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
    }

    async getWordCount(file: TFile): Promise<number> {
        const fileContents = await this.plugin.app.vault.read(file);
        const countPunctuation = this.plugin.settings.countPunctuation;

        const words = fileContents.replace(/\s/g, '');

        if (!countPunctuation) {
            const noPunctuation = words.replace(/[\p{P}\p{S}]/gu, '');
            return noPunctuation.length;
        }

        return words.length;
    }

    async getTotalWordCount(folder: TFolder): Promise<number> {
        let totalWordCount = 0;

        const calculateWordCount = async (folder: TFolder) => {
            for (const child of folder.children) {
                if (child instanceof TFile) {
                    const wordCount = await this.getWordCount(child);
                    totalWordCount += wordCount;
                } else if (child instanceof TFolder) {
                    await calculateWordCount(child);
                }
            }
        };

        await calculateWordCount(folder);
        return totalWordCount;
    }
}

// 辅助函数，用于创建SVG元素
export async function createSvgElement(svgCode: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'text/html');
    return doc.body.firstChild;
}