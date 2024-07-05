import { App, ButtonComponent, ItemView, Modal, Notice, TextComponent, TFolder } from "obsidian";

// 新建灵感的模态框
export class NewInspirationModal extends Modal {
    folder: TFolder;
    view: ItemView;

    constructor(app: App, folder: TFolder, view: ItemView, refreshCallback: () => void) {
        super(app);
        this.folder = folder;
        this.view = view;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { cls: 'pluginModal', text: '添加灵感' });

        const input = new TextComponent(contentEl);
        input.setPlaceholder('灵感标题');

        const descInputEl = contentEl.createEl('textarea', { cls: 'inspiration-textarea' });
        descInputEl.placeholder = '灵感详细内容';
        descInputEl.rows = 10;
        descInputEl.style.width = '100%';

        new ButtonComponent(contentEl)
            .setButtonText('创建')
            .setCta()
            .onClick(async () => {
                const fileName = input.getValue();
                const fileContent = descInputEl.value;
                if (!fileName) {
                    new Notice('灵感标题不能为空');
                    return;
                }
                
                const filePath = `${this.folder.path}/${fileName}.md`;
                console.log(this.folder);
                console.log(filePath);
                await this.app.vault.create(filePath, fileContent);
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}