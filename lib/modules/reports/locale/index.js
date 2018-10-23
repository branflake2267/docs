const AppBase     = require('../../create-app-html');

class Reporting extends AppBase {

    recurseItems (memberTypes, className) {
        for (let i = 0; i < memberTypes.length; i++) {
            let member = memberTypes[i];

            if (member.locale) {
                let name = member.name,
                    from = member.from,
                    val  = member.value,
                    msg  = className + "\t" + name + "\t" + val + ",";

                if (!from) {
                    this.log(msg);
                }
            }

            if (member.items) {
                this.recurseItems(member.items, className);
            }

        }
    }

    decorateClass (className) {
        const classMap    = this.classMap,
              raw         = classMap[className].raw,
              cls         = raw.global.items[0],
              memberTypes = cls.items;

        if (memberTypes) {
            this.recurseItems(memberTypes, className);
        }

        super.decorateClass(className);
    }

}

module.exports = Reporting;
