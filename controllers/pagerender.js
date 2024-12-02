const Materials = require("../models/materials");

const pageRender = {
    async getDashboard(req, res){
        try {
            res.render('dashboard', {
                totalMaterials: 100,
                totalSupplies: 80,
                totalUsers: 50
            })
        } catch (error) {
            console.error(error);
        }
    },
    async getMaterials(req, res){
        try {
            // const materials = await Materials.find();
            const materials = [
                {
                  name: '503',
                  weight: 25,
                  stock: 457,
                  unitPrice: 1200,
                  description: 'demometry materials forruck'
                },
                {
                    name: '503',
                    weight: 25,
                    stock: 457,
                    unitPrice: 1200,
                    description: 'demometry materials forruck'
                  },
                  {
                    name: '503',
                    weight: 25,
                    stock: 457,
                    unitPrice: 1200,
                    description: 'demometry materials forruck'
                  },
                  {
                    name: '503',
                    weight: 25,
                    stock: 457,
                    unitPrice: 1200,
                    description: 'demometry materials forruck'
                  },
                  {
                    name: '503',
                    weight: 25,
                    stock: 457,
                    unitPrice: 1200,
                    description: 'demometry materials forruck'
                  },
                  {
                    name: '503',
                    weight: 25,
                    stock: 457,
                    unitPrice: 1200,
                    description: 'demometry materials forruck'
                  },
              ];

            res.render('materials', {
                totalMaterials: 100,
                totalSupplies: 80,
                totalUsers: 50,
                materials,
                // trucks
            })
 
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = pageRender;