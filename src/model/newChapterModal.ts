import { ItemView, TFolder, Notice, Modal, TextComponent, ButtonComponent, App} from 'obsidian';

// 新建章节的模态框
export class NewChapterModal extends Modal {
    folder: TFolder;
    view: ItemView;
    itemType: string; // 新建项目的类型，例如 "章节"、"灵感" 等
    refreshCallback: () => void;

    constructor(app: App, folder: TFolder, view: ItemView, itemType: string, refreshCallback: () => void) {
        super(app);
        this.folder = folder;
        this.view = view;
        this.itemType = itemType;
        this.refreshCallback = refreshCallback;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { cls: 'pluginModal', text: `新建${this.itemType}` });

        const input = new TextComponent(contentEl);
        input.setPlaceholder(`${this.itemType}名称`);

        new ButtonComponent(contentEl)
            .setButtonText('创建')
            .setCta()
            .onClick(async () => {
                const fileName = input.getValue();
                if (!fileName) {
                    new Notice(`${this.itemType}名称不能为空`);
                    return;
                }

                const filePath = `${this.folder.path}/${fileName}.md`;
                await this.app.vault.create(filePath, '');
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}