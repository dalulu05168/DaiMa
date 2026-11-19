var files = new ActiveXObject("Scripting.FileSystemObject");
var shell = new ActiveXObject("WScript.Shell");
var root = files.GetParentFolderName(WScript.ScriptFullName);
var showApp = WScript.Arguments.length === 1 && WScript.Arguments.Item(0) === "app";

function quote(value) {
    return '"' + value + '"';
}

try {
    var node = files.BuildPath(root, "runtime\\node.exe");
    if (!files.FileExists(node)) {
        var nodePath = files.BuildPath(root, "node-path.txt");
        if (files.FileExists(nodePath)) {
            var nodeFile = files.OpenTextFile(nodePath, 1, false);
            node = nodeFile.ReadLine();
            nodeFile.Close();
        }
        if (!files.FileExists(node)) node = "node.exe";
    }
    shell.CurrentDirectory = root;
    var command = quote(node) + " " + quote(files.BuildPath(root, "start-local.cjs")) +
        (showApp ? " --edge-app" : " --no-browser");
    var code = shell.Run(command, 0, true);
    if (code !== 0 && showApp) {
        shell.Popup("CloudCLI did not start. Check claudecodeui-local\\data\\cloudcli.log.", 0, "Westcott", 48);
    }
    WScript.Quit(code);
} catch (error) {
    if (showApp) shell.Popup(error.message, 0, "Westcott", 48);
    WScript.Quit(1);
}
