import { App, ButtonComponent, ItemView, Modal, TFile, TFolder } from "obsidian";


// 删除确认的模态框
export class ConfirmDeleteModal extends Modal {
    fileOrFolder: TFile | TFolder;
    view: ItemView;
    refreshCallback: () => void;

    constructor(app: App, fileOrFolder: TFile | TFolder, view: ItemView, refreshCallback: () => void) {
        super(app);
        this.fileOrFolder = fileOrFolder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { cls: 'pluginModal', text: '确认删除' });

        const fileType = this.fileOrFolder instanceof TFile ? '文件' : '文件夹';
        contentEl.createEl('span', { text: `删除${fileType}——` });
        const strongtext = contentEl.createEl('span', { text: `${this.fileOrFolder.name.replace(/\.md$/, '')}` });
        strongtext.style.fontWeight = 'bold';
        strongtext.style.color = 'var(--bold-color)';
        new ButtonComponent(contentEl)
            .setButtonText('删除')
            .setCta()
            .onClick(async () => {
                await this.app.vault.trash(this.fileOrFolder, false);
                this.close();
                this.refreshCallback();
            });

        new ButtonComponent(contentEl)
            .setButtonText('取消')
            .onClick(() => {
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}