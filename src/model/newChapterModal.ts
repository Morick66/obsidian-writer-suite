import { ItemView, TFolder, Notice, Modal, TextComponent, ButtonComponent, App} from 'obsidian';

// 新建章节的模态框
export class NewChapterModal extends Modal {
    folder: TFolder;
    view: ItemView;

    constructor(app: App, folder: TFolder, view: ItemView, refreshCallback: () => void) {
        super(app);
        this.folder = folder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { cls: 'pluginModal', text: '新建章节' });

        const input = new TextComponent(contentEl);
        input.setPlaceholder('章节名称');

        new ButtonComponent(contentEl)
            .setButtonText('创建')
            .setCta()
            .onClick(async () => {
                const fileName = input.getValue();
                if (!fileName) {
                    new Notice('章节名称不能为空');
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